import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { supabase } from '../../supabaseClient';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { ArrowLeft, Plus, Trash2, Edit2, Loader2, Save, Upload, Key, Store, QrCode, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import jsQR from 'jsqr';

export default function AdminWebSettings() {
  const navigate = useNavigate();
  const { showToast, showConfirm } = useNotifications();
  const [storeName, setStoreName] = useState('');
  const [storeNameForm, setStoreNameForm] = useState('');
  const [storeId, setStoreId] = useState('');
  const [storeIdForm, setStoreIdForm] = useState('');
  const [qrisString, setQrisString] = useState('');
  const [qrisImageUrl, setQrisImageUrl] = useState('');
  const [adminPhones, setAdminPhones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingStore, setSavingStore] = useState(false);
  const [addingPhone, setAddingPhone] = useState(false);
  
  // Form untuk admin phone baru
  const [newPhoneName, setNewPhoneName] = useState('');
  const [newPhoneNum, setNewPhoneNum] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch store profile
      const { data: storeData } = await supabase
        .from('store_profile')
        .select('name, qris_string, qris_image_url, store_id')
        .eq('id', 1)
        .maybeSingle();

      if (storeData) {
        setStoreName(storeData.name || '');
        setStoreNameForm(storeData.name || '');
        setStoreId(storeData.store_id || '');
        setStoreIdForm(storeData.store_id || '');
        setQrisString(storeData.qris_string || '');
        setQrisImageUrl(storeData.qris_image_url || '');
      }

      // 2. Fetch admin phones
      const { data: phonesData } = await supabase
        .from('admin_phones')
        .select('*')
        .order('created_at', { ascending: false });

      setAdminPhones(phonesData || []);
    } catch (err) {
      console.error('Error fetching settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveStoreProfile = async (e) => {
    e.preventDefault();
    const normalizedName = storeNameForm.trim();
    if (!normalizedName) {
      showToast('Nama bengkel tidak boleh kosong.', 'error');
      return;
    }
    setSavingStore(true);
    const { error } = await supabase
      .from('store_profile')
      .upsert({ id: 1, name: normalizedName, qris_string: qrisString, qris_image_url: qrisImageUrl, store_id: storeIdForm }, { onConflict: 'id' });
    setSavingStore(false);
    
    if (error) {
      showToast('Gagal menyimpan profil toko: ' + error.message, 'error');
    } else {
      setStoreName(normalizedName);
      setStoreId(storeIdForm);
      showToast('Pengaturan toko berhasil disimpan!', 'success');
    }
  };

  const handleAddAdminPhone = async (e) => {
    e.preventDefault();
    const name = newPhoneName.trim();
    const phone = newPhoneNum.trim();
    if (!name || !phone) {
      showToast('Nama dan Nomor Telepon harus diisi.', 'error');
      return;
    }
    setAddingPhone(true);
    const { error } = await supabase
      .from('admin_phones')
      .insert({ name, phone });
    setAddingPhone(false);

    if (error) {
      showToast('Gagal menambahkan nomor admin: ' + error.message, 'error');
    } else {
      setNewPhoneName('');
      setNewPhoneNum('');
      // Refresh list
      const { data: phonesData } = await supabase
        .from('admin_phones')
        .select('*')
        .order('created_at', { ascending: false });
      setAdminPhones(phonesData || []);
      showToast('Nomor admin berhasil ditambahkan!', 'success');
    }
  };

  const handleDeleteAdminPhone = async (id, phoneNum) => {
    if (adminPhones.length <= 1) {
      showToast('Harus ada minimal satu nomor admin yang terdaftar agar tidak terkunci dari dashboard.', 'error');
      return;
    }
    const confirmed = await showConfirm('Hapus Admin', `Apakah Anda yakin ingin menghapus admin dengan nomor ${phoneNum}?`);
    if (!confirmed) {
      return;
    }
    const { error } = await supabase
      .from('admin_phones')
      .delete()
      .eq('id', id);

    if (error) {
      showToast('Gagal menghapus nomor admin: ' + error.message, 'error');
    } else {
      setAdminPhones(adminPhones.filter(p => p.id !== id));
      showToast('Nomor admin berhasil dihapus.', 'success');
    }
  };

  const handleQRISUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          setQrisString(code.data);
          
          const fileExt = file.name.split('.').pop();
          const filePath = `qr_images/${Date.now()}.${fileExt}`;
          supabase.storage.from('qris-images').upload(filePath, file).then(({ data: uploadData, error: uploadError }) => {
      if (uploadError) {
        showToast('Gagal mengunggah gambar QR: ' + uploadError.message, 'error');
      } else {
        const { data: publicUrlData } = supabase.storage.from('qris-images').getPublicUrl(uploadData.path);
        if (publicUrlData) {
          setQrisImageUrl(publicUrlData.publicUrl);
        }
      }
          });
          
          showToast('QR Code QRIS berhasil didecode dan sedang diunggah (Jangan lupa klik Simpan)!', 'success');
    } else {
      showToast('Gagal mendeteksi QR Code dari gambar. Pastikan gambar QRIS memiliki kualitas yang baik dan QR code terlihat jelas.', 'error');
    }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <div className="bg-background border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Kelola Web</h1>
              <p className="text-xs text-muted-foreground">{storeName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* 1. Pengaturan Toko & QRIS */}
            <Card className="bg-background shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" /> Pengaturan Bengkel & QRIS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSaveStoreProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="storeNameInput">Nama Bengkel</Label>
                    <Input
                      id="storeNameInput"
                      value={storeNameForm}
                      onChange={(e) => setStoreNameForm(e.target.value)}
                      placeholder="Contoh: EGA GARAGE"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="storeIdInput" className="flex items-center gap-2">
                        <Key className="h-4 w-4" /> ID Bengkel (Untuk QRIS)
                      </Label>
                      {storeId && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                          ✓ Aktif Tersimpan: {storeId}
                        </span>
                      )}
                    </div>
                    <Input
                      id="storeIdInput"
                      value={storeIdForm}
                      onChange={(e) => setStoreIdForm(e.target.value)}
                      placeholder="Contoh: TOKO_01"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      ID ini digunakan sebagai penanda (store_id) unik saat mengecek pembayaran QRIS ke backend.
                    </p>
                  </div>

                  {/* Status Indikator QRIS */}
                  <div className="flex items-center gap-2 p-3 rounded-lg border">
                    {qrisString ? (
                      <>
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-green-700">QRIS Aktif</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                              ● Tersimpan
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Data QRIS sudah tersimpan dan siap digunakan untuk pembayaran pelanggan.
                          </p>
                        </div>
                        {qrisImageUrl && (
                          <a
                            href={qrisImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-primary hover:underline border rounded-md"
                          >
                            Lihat <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100">
                          <XCircle className="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-orange-700">QRIS Belum Aktif</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                              ● Belum Diatur
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Upload gambar QRIS atau masukkan string data QRIS secara manual.
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="qrisUpload">Upload QRIS (Scan QR Code)</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="qrisUpload"
                        type="file"
                        accept="image/*"
                        onChange={handleQRISUpload}
                        className="cursor-pointer"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pilih file gambar QRIS Anda. Sistem akan secara otomatis mendeteksi QR Code dan mengekstrak datanya.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="qrisStringInput">Data QRIS (String QR Code)</Label>
                    <Input
                      id="qrisStringInput"
                      value={qrisString}
                      onChange={(e) => setQrisString(e.target.value)}
                      placeholder="Tempelkan string QRIS di sini..."
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Ini adalah string data QRIS yang diekstrak. Anda juga dapat menempelkannya secara manual jika memiliki datanya.
                    </p>
                  </div>

                  <Button type="submit" disabled={savingStore} className="gap-2 w-full sm:w-auto">
                    {savingStore ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Simpan Pengaturan
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* 2. CRUD Admin Phones */}
            <Card className="bg-background shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" /> Kelola Hak Akses Admin (No Telepon)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Form Add */}
                <form onSubmit={handleAddAdminPhone} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-muted/20 p-4 rounded-lg border">
                  <div className="space-y-2">
                    <Label htmlFor="adminName">Nama Admin</Label>
                    <Input
                      id="adminName"
                      value={newPhoneName}
                      onChange={(e) => setNewPhoneName(e.target.value)}
                      placeholder="Nama Lengkap"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminPhone">Nomor Telepon</Label>
                    <Input
                      id="adminPhone"
                      value={newPhoneNum}
                      onChange={(e) => setNewPhoneNum(e.target.value)}
                      placeholder="Contoh: 1526422039"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={addingPhone} className="gap-2">
                    {addingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Tambah Admin
                  </Button>
                </form>

                {/* List Admin Phones */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Daftar Nomor Telepon Admin Terdaftar</h3>
                  {adminPhones.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada nomor admin yang terdaftar.</p>
                  ) : (
                    <div className="border rounded-lg divide-y bg-background">
                      {adminPhones.map((admin) => (
                        <div key={admin.id} className="flex justify-between items-center p-4">
                          <div>
                            <p className="font-medium text-sm">{admin.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{admin.phone}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteAdminPhone(admin.id, admin.phone)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}