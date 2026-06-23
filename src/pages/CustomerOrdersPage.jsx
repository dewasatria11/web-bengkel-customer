import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatPrice } from '@/lib/formatters';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STEPS = [
  {
    key: 'pending',
    label: 'Menunggu Konfirmasi',
    description: 'Order sudah dikirim dan menunggu konfirmasi admin.',
  },
  {
    key: 'confirmed',
    label: 'Diproses',
    description: 'Order sudah dikonfirmasi dan sedang diproses bengkel.',
  },
  {
    key: 'done',
    label: 'Selesai',
    description: 'Order selesai dan siap/berhasil diterima pelanggan.',
  },
];

const STATUS_META = {
  pending: {
    label: 'Menunggu Konfirmasi',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Clock,
  },
  confirmed: {
    label: 'Diproses',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: PackageCheck,
  },
  done: {
    label: 'Selesai',
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Dibatalkan',
    className: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
  },
};

function getStatusIndex(status) {
  if (status === 'done') return 2;
  if (status === 'confirmed') return 1;
  return 0;
}

function StatusTimeline({ status }) {
  if (status === 'cancelled') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <XCircle className="mt-0.5 h-5 w-5 text-red-600" />
          <div>
            <p className="font-semibold text-red-800">Pesanan Dibatalkan</p>
            <p className="text-sm text-red-700">
              Pesanan ini ditolak atau dibatalkan oleh admin bengkel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activeIndex = getStatusIndex(status);

  return (
    <div className="space-y-0">
      {STATUS_STEPS.map((step, index) => {
        const isCompleted = index <= activeIndex;
        const isCurrent = index === activeIndex;
        const isLast = index === STATUS_STEPS.length - 1;

        return (
          <div key={step.key} className="relative flex gap-3">
            {!isLast && (
              <div
                className={cn(
                  'absolute left-[10px] top-6 h-full w-0.5',
                  index < activeIndex ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
            <div
              className={cn(
                'relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border bg-background',
                isCompleted ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30 text-muted-foreground'
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
            </div>
            <div className={cn('pb-5', isLast && 'pb-0')}>
              <p className={cn('text-sm font-semibold', isCurrent ? 'text-primary' : 'text-foreground')}>
                {step.label}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CustomerOrdersPage() {
  const navigate = useNavigate();
  const { customer } = useAuth();
  const [storeName, setStoreName] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const customerMotor = useMemo(() => {
    if (!customer) return '';
    return `${customer.merk_motor} · ${customer.plat_nomor}`;
  }, [customer]);

  const fetchOrders = async () => {
    if (!customer?.id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('web_orders')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    if (error) {
      alert('Gagal memuat track record pesanan: ' + error.message);
    } else {
      setOrders(data || []);
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
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [customer?.id]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar storeName={storeName} />

      <div className="container-pos py-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold">Track Record Pesanan</h2>
              <p className="text-sm text-muted-foreground">
                Pantau status pesanan Anda secara real-time
              </p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground/60" />
              <h3 className="mb-2 font-semibold">Belum ada pesanan</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Pesanan servis atau produk Anda akan tampil di sini setelah checkout.
              </p>
              <Button onClick={() => navigate('/home')}>Mulai Pesan</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const meta = STATUS_META[order.status] || STATUS_META.pending;
              const StatusIcon = meta.icon;
              const items = Array.isArray(order.items) ? order.items : [];

              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <p className="text-xs font-semibold text-muted-foreground">
                            ID: ...{order.id.slice(-8).toUpperCase()}
                          </p>
                          <Badge variant="outline" className={cn('gap-1', meta.className)}>
                            <StatusIcon className="h-3 w-3" />
                            {meta.label}
                          </Badge>
                        </div>
                        <h3 className="font-bold">{order.customer_name}</h3>
                        <p className="text-xs text-muted-foreground">{customerMotor}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-bold text-primary">{formatPrice(order.total)}</p>
                        <p className="mt-1 text-xs uppercase text-muted-foreground">
                          {order.payment_method}
                        </p>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="mb-5">
                      <p className="mb-3 text-sm font-semibold">Status Pesanan</p>
                      <StatusTimeline status={order.status} />
                    </div>

                    <Separator className="my-4" />

                    <div>
                      <p className="mb-3 text-sm font-semibold">Item Pesanan</p>
                      <div className="space-y-2">
                        {items.map((item, index) => (
                          <div key={`${order.id}-${item.id}-${index}`} className="flex items-start justify-between gap-3 text-sm">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.type === 'service' ? 'Servis' : 'Produk'} · Qty {item.qty}
                              </p>
                            </div>
                            <p className="font-semibold">{formatPrice(item.price * item.qty)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}