import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { ArrowLeft, Loader2, RefreshCw, Users, Phone, Bike } from 'lucide-react';

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
};

const formatDate = () => {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const jenisMotorLabel = {
  matic: 'Matic',
  gigi: 'Gigi',
  kopling: 'Kopling',
};

export default function AdminQueue() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('EGA GARAGE');
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    const { start, end } = getTodayRange();

    const { data, error } = await supabase
      .from('customers')
      .select('id, antrian, nama, no_telepon, jenis_motor, merk_motor, plat_nomor, created_at')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('antrian', { ascending: true });

    if (!error) {
      setQueue(data || []);
    } else {
      console.error('Gagal mengambil data antrian:', error);
    }
    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    supabase
      .from('store_profile')
      .select('name')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) setStoreName(data.name);
      });
    fetchQueue();
  }, [fetchQueue]);

  // Realtime subscription + Backup auto-refresh 30s
  useEffect(() => {
    // 1. Setup Supabase Realtime Listener (Langsung kedeteksi detik itu juga saat ada user login/register)
    const channel = supabase
      .channel('public:customers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    // 2. Backup interval setiap 30 detik
    const interval = setInterval(() => {
      fetchQueue();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchQueue]);

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Nomor Antrian Hari Ini</h1>
              <p className="text-xs text-muted-foreground">{storeName} · {formatDate()}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchQueue} className="gap-1">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6">
        {/* Summary Card */}
        <div className="bg-primary text-primary-foreground rounded-xl p-5 mb-6 flex items-center justify-between shadow-md">
          <div>
            <p className="text-sm font-medium opacity-80">Total Antrian Hari Ini</p>
            <p className="text-4xl font-black mt-1">{queue.length}</p>
            <p className="text-xs opacity-70 mt-1">
              {lastRefresh ? `Diperbarui: ${lastRefresh.toLocaleTimeString('id-ID')}` : ''}
            </p>
          </div>
          <div className="h-16 w-16 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <Users className="h-8 w-8" />
          </div>
        </div>

        {/* Queue List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : queue.length === 0 ? (
          <div className="text-center py-16 bg-background border rounded-xl">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-muted-foreground">Belum ada antrian hari ini</p>
            <p className="text-xs text-muted-foreground mt-1">Antrian akan muncul saat customer login</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((cust) => (
              <Card
                key={cust.id}
                className="bg-background shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Nomor Antrian */}
                    <div className="flex items-center justify-center w-20 bg-primary/5 border-r shrink-0">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground font-medium">No.</p>
                        <p className="text-3xl font-black text-primary leading-none">{cust.antrian}</p>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="flex-1 p-4 space-y-1.5">
                      <h3 className="font-bold text-base text-foreground leading-tight">{cust.nama}</h3>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span>{cust.no_telepon}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Bike className="h-3 w-3 shrink-0" />
                        <span>
                          {cust.merk_motor}
                          {cust.plat_nomor ? ` · ${cust.plat_nomor}` : ''}
                          {cust.jenis_motor ? ` (${jenisMotorLabel[cust.jenis_motor] || cust.jenis_motor})` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Login Time */}
                    <div className="flex items-center pr-4 text-right shrink-0">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Login</p>
                        <p className="text-xs font-semibold text-foreground">
                          {new Date(cust.created_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {queue.length > 0 && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            Menampilkan {queue.length} antrian · Realtime & Auto-refresh 30s
          </p>
        )}
      </div>
    </div>
  );
}