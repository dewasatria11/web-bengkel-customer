import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useNotifications } from '../../context/NotificationContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { ArrowLeft, Plus, Search, Trash2, Edit2, Loader2, Wrench } from 'lucide-react';
import { formatPrice } from '../../lib/formatters';

export default function AdminServices() {
  const navigate = useNavigate();
  const { showToast, showConfirm } = useNotifications();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [storeName, setStoreName] = useState('EGA GARAGE');

  // Dialog States
  const [open, setOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [form, setForm] = useState({
    name: '',
    price: 0,
    price_max: 0,
    description: '',
    is_active: true
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setServices(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase
      .from('store_profile')
      .select('name')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) setStoreName(data.name);
      });
    fetchServices();
  }, []);

  const handleOpenAdd = () => {
    setEditingService(null);
    setForm({
      name: '',
      price: 0,
      price_max: 0,
      description: '',
      is_active: true
    });
    setOpen(true);
  };

  const handleOpenEdit = (service) => {
    setEditingService(service);
    setForm({
      name: service.name,
      price: service.price,
      price_max: service.price_max || 0,
      description: service.description || '',
      is_active: service.is_active
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm('Hapus Jasa Servis', 'Apakah Anda yakin ingin menghapus jasa servis ini?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      showToast('Gagal menghapus jasa servis: ' + error.message, 'error');
    } else {
      showToast('Jasa servis berhasil dihapus', 'success');
      fetchServices();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: form.name,
      price: Number(form.price),
      price_max: Number(form.price_max),
      description: form.description,
      is_active: form.is_active
    };

    let error = null;
    if (editingService) {
      const { error: err } = await supabase
        .from('services')
        .update(payload)
        .eq('id', editingService.id);
      error = err;
    } else {
      const { error: err } = await supabase
        .from('services')
        .insert(payload);
      error = err;
    }

    setSubmitting(false);
    if (error) {
      showToast('Gagal menyimpan jasa servis: ' + error.message, 'error');
    } else {
      showToast('Jasa servis berhasil disimpan', 'success');
      setOpen(false);
      fetchServices();
    }
  };

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Kelola Jasa Servis</h1>
              <p className="text-xs text-muted-foreground">{storeName}</p>
            </div>
          </div>
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Tambah Jasa
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari jasa servis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Services List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-background border rounded-lg">
            <p className="text-muted-foreground">Tidak ada jasa servis ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((service) => (
              <Card key={service.id} className="bg-background shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{service.name}</h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          service.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {service.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {service.description || 'Tidak ada deskripsi'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-primary font-bold text-lg whitespace-nowrap">
                        {service.price_max > service.price 
                          ? `${formatPrice(service.price)} - ${formatPrice(service.price_max)}` 
                          : formatPrice(service.price)}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 border-t pt-4">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => handleOpenEdit(service)}>
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" className="gap-1" onClick={() => handleDelete(service.id)}>
                      <Trash2 className="h-3.5 w-3.5" /> Hapus
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog Form */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md w-[95%] sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Jasa Servis' : 'Tambah Jasa Servis Baru'}</DialogTitle>
            <DialogDescription>
              Isi data detail paket atau jasa servis di bawah ini.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="name">Nama Jasa Servis</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Servis Ringan Matic"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="price">Harga Min (Rp)</Label>
                <Input
                  id="price"
                  type="number"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="50000"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="price_max">Harga Max (Rp)</Label>
                <Input
                  id="price_max"
                  type="number"
                  value={form.price_max}
                  onChange={(e) => setForm({ ...form, price_max: e.target.value })}
                  placeholder="150000 (Opsional, isi 0 jika pas)"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Deskripsi</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Contoh: Pembersihan CVT, ganti oli, cek rem & kelistrikan"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                id="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="is_active" className="cursor-pointer font-medium text-sm">
                Aktifkan Jasa Servis (Tampil di Katalog Pelanggan)
              </Label>
            </div>

            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}