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
  Loader2
} from 'lucide-react';
import { formatPrice } from '../../lib/formatters';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    productsCount: 0,
    servicesCount: 0,
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
          .from('products')
          .select('*', { count: 'exact', head: true });

        const { count: servicesCount } = await supabase
          .from('services')
          .select('*', { count: 'exact', head: true });

        const { count: ordersCount } = await supabase
          .from('web_orders')
          .select('*', { count: 'exact', head: true });

        const { count: unreadOrdersCount } = await supabase
          .from('web_orders')
          .select('*', { count: 'exact', head: true })
          .eq('is_read_by_admin', false);

        setStats({
          productsCount: productsCount || 0,
          servicesCount: servicesCount || 0,
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
    if (!normalizedName) {
      alert('Nama bengkel tidak boleh kosong.');
      return;
    }

    setSavingStoreName(true);
    const { error } = await supabase
      .from('store_profile')
      .upsert({ id: 1, name: normalizedName }, { onConflict: 'id' });

    setSavingStoreName(false);

    if (error) {
      alert('Gagal menyimpan nama bengkel: ' + error.message);
      return;
    }

    setStoreName(normalizedName);
    setSettingsOpen(false);
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      {/* Top Header */}
      <div className="bg-background border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-primary">{storeName}</h1>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Ubah nama bengkel"
                onClick={() => {
                  setStoreNameForm(storeName);
                  setSettingsOpen(true);
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Admin Control Panel</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4 mr-2" />
            Keluar
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Selamat Datang, Admin</h2>
          <p className="text-sm text-muted-foreground">Kelola produk, jasa servis, dan pesanan pelanggan.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Produk</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.productsCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Jasa Servis</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.servicesCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Pesanan Masuk</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.ordersCount}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Pesanan Baru (Belum Dibaca)</CardTitle>
              <TrendingUp className="h-4 w-4 text-destructive animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {loading ? '...' : stats.unreadOrdersCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Cards */}
        <h3 className="text-lg font-bold mb-4">Navigasi Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/products')}>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <PackageOpen className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base">Kelola Produk & Stock</h4>
                  <p className="text-xs text-muted-foreground">Tambah, edit, hapus produk & set URL gambar</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/services')}>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Wrench className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base">Kelola Jasa Servis</h4>
                  <p className="text-xs text-muted-foreground">Tambah, edit, hapus paket atau jasa servis</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer relative" onClick={() => navigate('/admin/orders')}>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base">Kelola Pesanan Pelanggan</h4>
                  <p className="text-xs text-muted-foreground">Konfirmasi pembayaran, ubah status pesanan</p>
                </div>
              </div>
              {stats.unreadOrdersCount > 0 && (
                <span className="absolute top-2 right-2 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md w-[95%] p-6">
          <DialogHeader>
            <DialogTitle>Ubah Nama Bengkel</DialogTitle>
            <DialogDescription>
              Nama ini akan tampil di website pelanggan dan halaman admin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveStoreName} className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="store-name">Nama Bengkel</Label>
              <Input
                id="store-name"
                required
                value={storeNameForm}
                onChange={(e) => setStoreNameForm(e.target.value)}
                placeholder="Contoh: EGA GARAGE"
              />
            </div>
            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)} disabled={savingStoreName}>
                Batal
              </Button>
              <Button type="submit" disabled={savingStoreName}>
                {savingStoreName ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
