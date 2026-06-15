import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { supabase } from '../supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wrench, ShoppingBag, Info, LogOut, Bike, Phone } from 'lucide-react';

const JENIS_LABEL = { matic: 'Matic', gigi: 'Gigi', kopling: 'Kopling' };

export default function HomePage() {
  const { customer, logout } = useAuth();
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState('');

  useEffect(() => {
    supabase
      .from('store_profile')
      .select('name')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setStoreName(data.name);
      });
  }, []);

  if (!customer) return null;

  const motorLabel = `${customer.merk_motor} (${
    JENIS_LABEL[customer.jenis_motor] || customer.jenis_motor
  })`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar storeName={storeName} />

      <div className="container-pos py-6 space-y-6">
        {/* Welcome Banner */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            {/* Queue Number Badge */}
            <Badge
              variant="secondary"
              className="absolute top-4 right-4 flex flex-col items-center py-2 px-4"
            >
              <span className="text-xs text-muted-foreground uppercase">
                Antrian
              </span>
              <span className="text-2xl font-bold">#{customer.antrian}</span>
            </Badge>

            <div className="pr-20">
              <p className="text-sm text-muted-foreground mb-1">
                Selamat datang kembali 👋
              </p>
              <h1 className="text-2xl font-bold mb-2">{customer.nama}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bike className="h-4 w-4" />
                <span>
                  {motorLabel} · {customer.plat_nomor}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Pilih Layanan</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Service Menu */}
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/services')}
            >
              <CardContent className="p-6 text-center space-y-3">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white text-2xl">
                  <Wrench className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Jenis Servis</h3>
                  <p className="text-xs text-muted-foreground">
                    Pilih paket servis kendaraan Anda
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Product Menu */}
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/products')}
            >
              <CardContent className="p-6 text-center space-y-3">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl">
                  <ShoppingBag className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Beli Produk</h3>
                  <p className="text-xs text-muted-foreground">
                    Spare part & produk tersedia
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Info Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-semibold text-sm">Info Kendaraan Anda</h3>
                <p className="text-sm text-muted-foreground">
                  {customer.merk_motor} • {JENIS_LABEL[customer.jenis_motor]} •{' '}
                  {customer.plat_nomor}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{customer.no_telepon}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Button
          variant="ghost"
          className="w-full"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Keluar Akun
        </Button>
      </div>
    </div>
  );
}
