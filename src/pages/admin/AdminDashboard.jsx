import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';
import { useNotifications } from '../../context/NotificationContext';
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
  Hash,
  Settings,
  MessageSquare,
  Globe
} from 'lucide-react';
import { formatPrice } from '../../lib/formatters';

import { useStore } from '../../context/StoreContext';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { showAlert } = useNotifications();
  const [stats, setStats] = useState({
    productsCount: 0,
    servicesCount: 0,
    mechanicsCount: 0,
    ordersCount: 0,
    unreadOrdersCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const { storeName } = useStore();
  const [storeNameForm, setStoreNameForm] = useState('');

  useEffect(() => {
    setStoreNameForm(storeName);
  }, [storeName]);

  useEffect(() => {
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
    fetchStats();
  }, []);


  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <div className="bg-background border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{storeName}</h1>
            <p className="text-xs text-muted-foreground">Dashboard Admin</p>
          </div>
          <div className="flex items-center gap-2">
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
          <h2 className="text-lg font-bold mb-4">Menu</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <Card className="hover:shadow-md transition-shadow cursor-pointer relative" onClick={() => navigate('/admin/orders')}>
              <CardContent className="p-6 flex items-center justify-between h-full">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Pesanan</h4>
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
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/products')}>
              <CardContent className="p-6 flex items-center justify-between h-full">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <PackageOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Atur Produk</h4>
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
                    <h4 className="font-bold text-sm">Atur Servis</h4>
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
                    <h4 className="font-bold text-sm">Atur Mekanik</h4>
                    <p className="text-xs text-muted-foreground">Tambah & edit data mekanik</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/reminders')}>
              <CardContent className="p-6 flex items-center justify-between h-full">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Reminder Pelanggan</h4>
                    <p className="text-xs text-muted-foreground">Kirim pengingat servis via WhatsApp</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/web-settings')}>
              <CardContent className="p-6 flex items-center justify-between h-full">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Globe className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Kelola Web</h4>
                    <p className="text-xs text-muted-foreground">Pengaturan nama bengkel, admin, & QRIS</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
              if (window.AndroidApp && typeof window.AndroidApp.openSettings === 'function') {
                window.AndroidApp.openSettings();
              } else {
                showAlert('Informasi', 'Fitur ini hanya dapat digunakan melalui aplikasi Android.', 'info');
              }
            }}>
              <CardContent className="p-6 flex items-center justify-between h-full">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Settings className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Kelola Aplikasi</h4>
                    <p className="text-xs text-muted-foreground">Pengaturan integrasi notifikasi & printer</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

