import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Package,
  Wrench,
  ClipboardList,
  LogOut,
  ChevronRight,
  TrendingUp,
  PackageOpen
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

  useEffect(() => {
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
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      {/* Top Header */}
      <div className="bg-background border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-primary">EGA GARAGE</h1>
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
    </div>
  );
}