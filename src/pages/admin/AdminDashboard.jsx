import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import {
  Package,
  Wrench,
  ClipboardList,
  LogOut,
  ChevronRight,
  TrendingUp,
  PackageOpen,
  Edit2,
  Loader2,
  Users,
  Hash
} from 'lucide-react';
import { formatPrice } from '../../lib/formatters';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    productsCount: 0,
    servicesCount: 0,
    mechanicsCount: 0,
    ordersCount: 0,
    unreadOrdersCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('EGA GARAGE');
  const [storeNameForm, setStoreNameForm] = useState('EGA GARAGE');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingStoreName, setSavingStoreName] = useState(false);

  useEffect(() => {
    async function fetchStoreName() {
      const { data } = await supabase
        .from('store_profile')
        .select('name')
        .eq('id', 1)
        .maybeSingle();
      if (data?.name) {
        setStoreName(data.name);
        setStoreNameForm(data.name);
      }
    }

    async function fetchStats() {
      try {
        const { count: productsCount } = await supabase
          .from('products').select('*', { count: 'exact', head: true });
        const { count: servicesCount } = await supabase
          .from('services').select('*', { count: 'exact', head: true });
        const { count: mechanicsCount } = await supabase
          .from('mechanics').select('*', { count: 'exact', head: true });
        const { count: ordersCount } = await supabase
          .from('web_orders').select('*', { count: 'exact', head: true });
        const { count: unreadOrdersCount } = await supabase
          .from('web_orders').select('*', { count: 'exact', head: true })
          .eq('is_read_by_admin', false);

        setStats({
          productsCount: productsCount || 0,
          servicesCount: servicesCount || 0,
          mechanicsCount: mechanicsCount || 0,
          ordersCount: ordersCount || 0,
          unreadOrdersCount: unreadOrdersCount || 0,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStoreName();
    fetchStats();
  }, []);

  const handleSaveStoreName = async (e) => {
    e.preventDefault();
    const normalizedName = storeNameForm.trim();
    if (!normalizedName) { alert('Nama bengkel tidak boleh kosong.'); return; }
    setSavingStoreName(true);
    const { error } = await supabase
      .from('store_profile')
      .upsert({ id: 1, name: normalizedName }, { onConflict: 'id' });
    setSavingStoreName(false);
    if (error) { alert('Gagal menyimpan nama bengkel: ' + error.message); return; }
    setStoreName(normalizedName);
    setSettingsOpen(false);
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <div className="bg-background border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{storeName}</h1>
            <p className="text-xs text-muted-foreground">Dashboard Admin</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="gap-1">
              <Edit2 className="h-4 w-4" /> Nama Toko
            </Button>
            <Button variant="outline" size="sm" onClick={logout} className="gap-1 text-destructive">
              <LogOut className="h-4 w-4" /> Keluar
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-background shadow-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.productsCount}</p>
                  <p className="text-xs text-muted-foreground">Produk</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background shadow-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                  <Wrench className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.servicesCount}</p>
                  <p className="text-xs text-muted-foreground">Servis</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background shadow-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.mechanicsCount}</p>
                  <p className="text-xs text-muted-foreground">Mekanik</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background shadow-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div className="relative">
                  <p className="text-2xl font-bold">{stats.ordersCount}</p>
                  <p className="text-xs text-muted-foreground">Pesanan</p>
                  {stats.unreadOrdersCount > 0 && (
                    <span className="absolute -top-1 -right-4 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div>
          <h2 className="text-lg font-bold mb-4">Menu Kelola</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/products')}>
              <CardContent className="p-6 flex items-center justify-between h-full">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <PackageOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Kelola Produk</h4>
                    <p className="text-xs text-muted-foreground">Tambah & edit spare part</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/services')}>
              <CardContent className="p-6 flex items-center justify-between h-full">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Wrench className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Kelola Servis</h4>
                    <p className="text-xs text-muted-foreground">Tambah & edit paket servis</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/mechanics')}>
              <CardContent className="p-6 flex items-center justify-between h-full">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Kelola Mekanik</h4>
                    <p className="text-xs text-muted-foreground">Tambah & edit data mekanik</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer relative" onClick={() => navigate('/admin/orders')}>
              <CardContent className="p-6 flex items-center justify-between h-full">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Kelola Pesanan</h4>
                    <p className="text-xs text-muted-foreground">Konfirmasi & status pesanan</p>
                  </div>
                </div>
                {stats.unreadOrdersCount > 0 && (
                  <span className="absolute top-2 right-2 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/stats')}>
              <CardContent className="p-6 flex items-center justify-between h-full">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Statistik & Laporan</h4>
                    <p className="text-xs text-muted-foreground">Lihat pendapatan & item terlaris</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/queue')}>
              <CardContent className="p-6 flex items-center justify-between h-full">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Hash className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Antrian Customer</h4>
                    <p className="text-xs text-muted-foreground">Lihat nomor antrian hari ini</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>


      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md w-[95%] p-6">
          <DialogHeader>
            <DialogTitle>Ubah Nama Bengkel</DialogTitle>
            <DialogDescription>Nama ini akan tampil di website pelanggan dan halaman admin.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveStoreName} className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="store-name">Nama Bengkel</Label>
              <Input id="store-name" required value={storeNameForm}
                onChange={(e) => setStoreNameForm(e.target.value)} placeholder="Contoh: EGA GARAGE" />
            </div>
            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)} disabled={savingStoreName}>Batal</Button>
              <Button type="submit" disabled={savingStoreName}>
                {savingStoreName ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</>) : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

