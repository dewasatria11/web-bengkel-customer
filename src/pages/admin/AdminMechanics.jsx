import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { supabase } from '../../supabaseClient';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { ArrowLeft, Plus, Search, Trash2, Edit2, Loader2, Users } from 'lucide-react';

export default function AdminMechanics() {
  const navigate = useNavigate();
  const { showToast, showConfirm } = useNotifications();
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [storeName, setStoreName] = useState('');
  const [open, setOpen] = useState(false);
  const [editingMechanic, setEditingMechanic] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', specialization: '', is_active: true });
  const [submitting, setSubmitting] = useState(false);

  const fetchMechanics = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('mechanics').select('*').order('created_at', { ascending: false });
    if (!error) setMechanics(data || []);
    setLoading(false);
  };

  useEffect(() => {
    supabase.from('store_profile').select('name').eq('id', 1).maybeSingle()
      .then(({ data }) => { if (data?.name) setStoreName(data.name); });
    fetchMechanics();
  }, []);

  const handleOpenAdd = () => {
    setEditingMechanic(null);
    setForm({ name: '', phone: '', specialization: '', is_active: true });
    setOpen(true);
  };

  const handleOpenEdit = (m) => {
    setEditingMechanic(m);
    setForm({ name: m.name, phone: m.phone || '', specialization: m.specialization || '', is_active: m.is_active });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm('Hapus Mekanik', 'Apakah Anda yakin ingin menghapus mekanik ini?');
    if (!confirmed) return;
    const { error } = await supabase.from('mechanics').delete().eq('id', id);
    if (error) {
      console.error('[AdminMechanics] Gagal menghapus mekanik:', error);
      const detail = [
        error.message,
        error.code ? `Code: ${error.code}` : null,
        error.hint ? `Hint: ${error.hint}` : null,
        error.details ? `Details: ${error.details}` : null,
      ].filter(Boolean).join('\n');
      showToast(`Gagal menghapus mekanik:\n\n${detail}`, 'error');
    } else {
      showToast('Mekanik berhasil dihapus', 'success');
      fetchMechanics();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = { name: form.name, phone: form.phone, specialization: form.specialization, is_active: form.is_active };
    let error = null;
    if (editingMechanic) {
      const { error: err } = await supabase.from('mechanics').update(payload).eq('id', editingMechanic.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('mechanics').insert(payload);
      error = err;
    }
    setSubmitting(false);
    if (error) {
      console.error('[AdminMechanics] Gagal menyimpan mekanik:', error);
      const detail = [
        error.message,
        error.code ? `Code: ${error.code}` : null,
        error.hint ? `Hint: ${error.hint}` : null,
        error.details ? `Details: ${error.details}` : null,
      ].filter(Boolean).join('\n');
      showToast(`Gagal menyimpan mekanik:\n\n${detail}`, 'error');
    } else {
      showToast('Mekanik berhasil disimpan', 'success');
      setOpen(false);
      fetchMechanics();
    }
  };

  const filtered = mechanics.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.specialization.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <div className="bg-background border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Kelola Mekanik</h1>
              <p className="text-xs text-muted-foreground">{storeName}</p>
            </div>
          </div>
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Tambah Mekanik
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Cari mekanik..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-background border rounded-lg">
            <p className="text-muted-foreground">Tidak ada mekanik ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((mechanic) => (
              <Card key={mechanic.id} className="bg-background shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${mechanic.is_active ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{mechanic.name}</h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${mechanic.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {mechanic.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {mechanic.specialization && <p className="text-sm text-muted-foreground"><span className="font-medium">Spesialisasi:</span> {mechanic.specialization}</p>}
                        {mechanic.phone && <p className="text-sm text-muted-foreground"><span className="font-medium">Telepon:</span> {mechanic.phone}</p>}
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 border-t pt-4">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => handleOpenEdit(mechanic)}>
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" className="gap-1" onClick={() => handleDelete(mechanic.id)}>
                      <Trash2 className="h-3.5 w-3.5" /> Hapus
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md w-[95%] sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>{editingMechanic ? 'Edit Mekanik' : 'Tambah Mekanik Baru'}</DialogTitle>
            <DialogDescription>Isi data detail mekanik bengkel di bawah ini.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="name">Nama Mekanik</Label>
              <Input id="name" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Ahmad Rizky" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Nomor Telepon</Label>
              <Input id="phone" type="tel" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Contoh: 081234567890" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="specialization">Spesialisasi</Label>
              <Input id="specialization" value={form.specialization}
                onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                placeholder="Contoh: Mesin Matic, Kelistrikan" />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input id="is_active" type="checkbox" checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
              <Label htmlFor="is_active" className="cursor-pointer font-medium text-sm">Aktifkan Mekanik</Label>
            </div>
            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Batal</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

