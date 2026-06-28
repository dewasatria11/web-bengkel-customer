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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const STATUS_META = {
  pending_inspection: {
    label: 'Menunggu Pemeriksaan',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: Clock,
  },
  pending_payment: {
    label: 'Menunggu Pembayaran',
    className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: Clock,
  },
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

const SERVICE_STATUS_STEPS = [
  {
    key: 'pending_inspection',
    label: 'Pemeriksaan Motor',
    description: 'Bawa kendaraan ke bengkel untuk pemeriksaan mekanik & estimasi biaya.',
  },
  {
    key: 'pending_payment',
    label: 'Menunggu Pembayaran',
    description: 'Bengkel telah mengirimkan tagihan final. Selesaikan pembayaran Anda.',
  },
  {
    key: 'confirmed',
    label: 'Pengerjaan Servis',
    description: 'Pembayaran dikonfirmasi. Mekanik mulai mengerjakan servis motor Anda.',
  },
  {
    key: 'done',
    label: 'Selesai',
    description: 'Pekerjaan selesai. Motor Anda siap diambil/diterima.',
  },
];

const PRODUCT_STATUS_STEPS = [
  {
    key: 'pending',
    label: 'Menunggu Konfirmasi',
    description: 'Order sudah dikirim dan menunggu konfirmasi admin.',
  },
  {
    key: 'confirmed',
    label: 'Diproses',
    description: 'Order sudah dikonfirmasi dan sedang diproses.',
  },
  {
    key: 'done',
    label: 'Selesai',
    description: 'Barang siap diambil / berhasil diterima.',
  },
];

function getServiceStatusIndex(status) {
  if (status === 'done') return 3;
  if (status === 'confirmed') return 2;
  if (status === 'pending_payment') return 1;
  return 0; // pending_inspection
}

function getProductStatusIndex(status) {
  if (status === 'done') return 2;
  if (status === 'confirmed') return 1;
  return 0; // pending
}

// Determine derived status for service orders (handles inspection & payment flow)
function getOrderStatus(order) {
  // For service or mixed orders, pending can mean inspection or payment pending
  if (order.order_type === 'service' || order.order_type === 'mixed') {
    if (order.status === 'pending') {
      // If no mechanic assigned yet, we are still waiting for inspection/estimation
      if (!order.mechanic_id) return 'pending_inspection';
      // Mechanic assigned => waiting for payment
      return 'pending_payment';
    }
  }
  // For product orders or any other status, just return the original status
  return order.status;
}

function StatusTimeline({ order }) {
  const status = order.status;
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

  const isServiceFlow = order.status === 'pending_inspection' || order.status === 'pending_payment' || order.order_type === 'service' || order.order_type === 'mixed';
  const steps = isServiceFlow ? SERVICE_STATUS_STEPS : PRODUCT_STATUS_STEPS;
  const activeIndex = isServiceFlow ? getServiceStatusIndex(status) : getProductStatusIndex(status);

  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const isCompleted = index <= activeIndex;
        const isCurrent = index === activeIndex;
        const isLast = index === steps.length - 1;

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

  // Payment states for customer pending_payment
  const [qrisImageUrl, setQrisImageUrl] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(''); // 'cash' | 'qris'
  const [showPaymentQris, setShowPaymentQris] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

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
      .select('name, qris_image_url')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setStoreName(data.name);
          setQrisImageUrl(data.qris_image_url);
        }
      });
  }, []);

  const submitPayment = async (orderId, method) => {
    setPayLoading(true);
    try {
      const { error } = await supabase
        .from('web_orders')
        .update({
          payment_method: method,
          status: 'confirmed', // update to 'Diproses' once payment is selected/paid
        })
        .eq('id', orderId);

      if (error) throw error;
      alert('Pembayaran berhasil dikonfirmasi! Pesanan sedang diproses.');
      fetchOrders();
      setPaymentOrder(null);
      setShowPaymentQris(false);
    } catch (err) {
      alert('Gagal memproses pembayaran: ' + err.message);
    } finally {
      setPayLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to real‑time updates on the web_orders table
    // so changes made by admin (such as status updates or mechanic assignments)
    // are immediately reflected without needing a page refresh.
    if (!customer?.id) return;

    const ordersChannel = supabase
      .channel(`orders-${customer.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'web_orders',
          filter: `customer_id=eq.${customer.id}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
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
              const derivedStatus = getOrderStatus(order);
              const meta = STATUS_META[derivedStatus] || STATUS_META.pending;
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
                        <p className="font-bold text-primary">
                          {derivedStatus === 'pending_inspection' && order.total === 0 ? 'Menunggu Estimasi' : formatPrice(order.total)}
                        </p>
                        <p className="mt-1 text-xs uppercase text-muted-foreground">
                          {order.payment_method === 'pending' ? 'Estimasi Jasa' : order.payment_method}
                        </p>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="mb-5">
                      <p className="mb-3 text-sm font-semibold">Status Pesanan</p>
                      <StatusTimeline order={order} />
                      {order.mechanic_name && (
                        <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Mekanik yang Ditugaskan</p>
                            <p className="text-sm font-semibold text-foreground">{order.mechanic_name}</p>
                          </div>
                        </div>
                      )}
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
                                {item.type === 'service' && item.price === 0 && (
                                  <span className="block text-[10px] text-muted-foreground">
                                    {item.price_max > item.price_min
                                      ? `Estimasi: ${formatPrice(item.price_min)} - ${formatPrice(item.price_max)}`
                                      : `Estimasi: ${formatPrice(item.price_min)}`}
                                  </span>
                                )}
                              </p>
                            </div>
                            <p className="font-semibold">
                              {item.type === 'service' && item.price === 0 ? 'Menunggu Estimasi' : formatPrice(item.price * item.qty)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {derivedStatus === 'pending_payment' && (
                      <div className="mt-5 p-4 border border-indigo-200 bg-indigo-50/50 rounded-lg space-y-3">
                        <p className="text-xs font-semibold text-indigo-900 uppercase">Tagihan Siap Dibayar</p>
                        <p className="text-xs text-indigo-950 leading-relaxed">
                          Bengkel telah melakukan pengecekan motor dan menetapkan tagihan final sebesar <strong className="text-primary text-sm">{formatPrice(order.total)}</strong>. Silakan bayar sekarang.
                        </p>
                        <Button 
                          size="sm" 
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                          onClick={() => {
                            setPaymentOrder(order);
                            setPaymentMethod('');
                            setShowPaymentQris(false);
                          }}
                        >
                          💵 Pilih Pembayaran & Bayar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Dialog for Customer */}
      <Dialog open={!!paymentOrder} onOpenChange={(open) => { if (!open) setPaymentOrder(null); }}>
        <DialogContent className="max-w-md w-[95%]">
          <DialogHeader>
            <DialogTitle>Pilih Metode Pembayaran</DialogTitle>
            <DialogDescription>
              Total Tagihan: {paymentOrder && formatPrice(paymentOrder.total)}
            </DialogDescription>
          </DialogHeader>

          {paymentOrder && (
            <div className="space-y-6 py-4">
              {!showPaymentQris ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Cash */}
                    <Card
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md text-center p-4 space-y-2 border',
                        paymentMethod === 'cash' && 'ring-2 ring-primary border-primary'
                      )}
                      onClick={() => setPaymentMethod('cash')}
                    >
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 mx-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                      </div>
                      <p className="font-semibold text-sm">Cash / Tunai</p>
                      <p className="text-[10px] text-muted-foreground">Bayar di kasir</p>
                    </Card>

                    {/* QRIS */}
                    <Card
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md text-center p-4 space-y-2 border',
                        paymentMethod === 'qris' && 'ring-2 ring-primary border-primary'
                      )}
                      onClick={() => setPaymentMethod('qris')}
                    >
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 mx-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="3"></rect><rect x="14" y="7" width="3" height="3"></rect><rect x="7" y="14" width="3" height="3"></rect><rect x="14" y="14" width="3" height="3"></rect></svg>
                      </div>
                      <p className="font-semibold text-sm">QRIS</p>
                      <p className="text-[10px] text-muted-foreground">Scan QR Code</p>
                    </Card>
                  </div>

                  {paymentMethod === 'cash' && (
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4 text-xs text-green-800 leading-relaxed">
                        Silakan konfirmasi pilihan Cash. Pembayaran tunai sebesar <strong>{formatPrice(paymentOrder.total)}</strong> dapat Anda serahkan langsung ke kasir bengkel saat mengambil motor Anda.
                      </CardContent>
                    </Card>
                  )}

                  {paymentMethod === 'qris' && (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4 text-xs text-blue-800 leading-relaxed">
                        Klik tombol di bawah untuk menampilkan QR Code pembayaran QRIS. Anda dapat men-scan QR tersebut dengan dompet digital Anda.
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-2 justify-end pt-4 border-t">
                    <Button variant="outline" size="sm" onClick={() => setPaymentOrder(null)}>
                      Batal
                    </Button>
                    {paymentMethod && (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (paymentMethod === 'qris') {
                            setShowPaymentQris(true);
                          } else {
                            submitPayment(paymentOrder.id, 'cash');
                          }
                        }}
                      >
                        {paymentMethod === 'qris' ? 'Lanjut Scan QRIS' : 'Konfirmasi Cash'}
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {qrisImageUrl ? (
                    <div className="flex justify-center p-3 bg-muted rounded-lg">
                      <img
                        src={qrisImageUrl}
                        alt="QR Code"
                        className="max-h-[300px] w-auto rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                      QR Code belum diunggah oleh admin.
                    </div>
                  )}

                  <p className="text-xs text-center text-muted-foreground">
                    Scan QRIS di atas dan bayar nominal sebesar <strong className="text-foreground">{formatPrice(paymentOrder.total)}</strong>. Klik tombol dibawah jika pembayaran sudah selesai.
                  </p>

                  <div className="flex gap-2 justify-end pt-4 border-t">
                    <Button variant="outline" size="sm" onClick={() => setShowPaymentQris(false)}>
                      Kembali
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => submitPayment(paymentOrder.id, 'qris')}
                      disabled={payLoading}
                    >
                      {payLoading ? 'Memproses...' : 'Saya Sudah Membayar'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
