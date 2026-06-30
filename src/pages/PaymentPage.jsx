import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import { useStore } from '../context/StoreContext';
import { useNotifications } from '../context/NotificationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatPrice } from '@/lib/formatters';
import {
  ArrowLeft,
  Banknote,
  QrCode,
  CheckCircle2,
  Loader2,
  Home,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { generateDynamicQRIS } from '@/lib/qris';

const JENIS_LABEL = { matic: 'Matic', gigi: 'Gigi', kopling: 'Kopling' };

export default function PaymentPage() {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const { customer } = useAuth();
  const { showToast } = useNotifications();

  const [method, setMethod] = useState(''); // 'cash' | 'qris'
  const [qrisImageUrl, setQrisImageUrl] = useState(null);
  const { storeName } = useStore();
  const [qrisString, setQrisString] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQris, setShowQris] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedInfo, setSubmittedInfo] = useState(null);

  useEffect(() => {
    supabase
      .from('store_profile')
      .select('name, qris_image_url, qris_string')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setQrisImageUrl(data.qris_image_url);
          setQrisString(data.qris_string || '');
        }
      });
  }, []);

  if (items.length === 0 && !submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container-pos py-12">
          <div className="text-center space-y-4">
            <div className="text-6xl">🛒</div>
            <h2 className="text-xl font-semibold">Keranjang kosong</h2>
            <Button onClick={() => navigate('/home')}>Kembali ke Menu</Button>
          </div>
        </div>
      </div>
    );
  }

  const serviceItems = items.filter((i) => i.type === 'service');
  const productItems = items.filter((i) => i.type === 'product');
  const hasService = serviceItems.length > 0;
  const productTotal = productItems.reduce((s, i) => s + i.price * i.qty, 0);

  const handleConfirm = async () => {
    if (hasService) {
      await submitOrder('cash');
      return;
    }
    if (!method) return;
    if (method === 'qris' && !showQris) {
      setShowQris(true);
      return;
    }
    await submitOrder(method);
  };

  const submitOrder = async (payMethod) => {
    setLoading(true);
    try {
      let orderType = 'mixed';
      if (serviceItems.length && !productItems.length) orderType = 'service';
      if (productItems.length && !serviceItems.length) orderType = 'product';

      const motorLabel = `${customer.merk_motor} (${
        JENIS_LABEL[customer.jenis_motor]
      }) - ${customer.plat_nomor}`;

      // Simpan item-item beserta data estimasi harganya jika merupakan jasa servis
      const itemsPayload = items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        price_min: i.price_min || i.price,
        price_max: i.price_max || i.price,
        qty: i.qty,
        type: i.type,
      }));

      // Pastikan payment_method hanya 'cash' atau 'qris'
      const safePaymentMethod = (payMethod === 'qris') ? 'qris' : 'cash';

      const { error } = await supabase.from('web_orders').insert({
        customer_id: customer.id,
        customer_name: customer.nama,
        customer_phone: customer.no_telepon,
        customer_motor: motorLabel,
        order_type: orderType,
        items: itemsPayload,
        total: hasService ? productTotal : total,
        payment_method: safePaymentMethod,
        status: 'pending',
        is_read_by_admin: false,
      });

      if (error) throw error;

      setSubmittedInfo({
        hasService,
        finalTotal: hasService ? productTotal : total,
        method: hasService ? 'Menunggu Estimasi Jasa' : (safePaymentMethod === 'cash' ? '💵 Cash' : '📱 QRIS')
      });
      clearCart();
      setSubmitted(true);
      setShowQris(false);
    } catch (err) {
      showToast('Gagal mengirim order: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Success State
  if (submitted && submittedInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md w-full">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-4">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {submittedInfo.hasService ? 'Booking Berhasil!' : 'Order Terkirim!'}
            </h1>
            <p className="text-muted-foreground">
              {submittedInfo.hasService 
                ? 'Booking Anda berhasil. Silakan bawa kendaraan ke bengkel untuk pemeriksaan mekanik & penetapan biaya final.'
                : 'Order Anda sudah diterima kasir dan sedang diproses.'}
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Detail customer
                </p>
                <p className="font-semibold text-lg">{customer.nama}</p>
                <p className="text-sm text-muted-foreground">
                  {customer.merk_motor} · {customer.plat_nomor}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Total Pembayaran
                </p>
                <p className="text-xl font-bold text-primary">
                  {submittedInfo.hasService ? (
                    submittedInfo.finalTotal > 0 ? `${formatPrice(submittedInfo.finalTotal)} + Jasa Servis (Estimasi)` : 'Menunggu Estimasi'
                  ) : (
                    formatPrice(submittedInfo.finalTotal)
                  )}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Metode: {submittedInfo.method}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button size="lg" className="w-full" onClick={() => navigate('/orders')}>
              Cek Status Pesanan
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={() => navigate('/home')}>
              <Home className="mr-2 h-5 w-5" />
              Kembali ke Menu Utama
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <Navbar />

      <div className="container-pos py-6">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Pembayaran</h2>
            <p className="text-sm text-muted-foreground">
              Pilih metode pembayaran
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Ringkasan Order</h3>
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={`${item.id}-${item.type}`}
                    className="flex justify-between items-start"
                  >
                    <div className="flex-1">
                      <Badge
                        variant="secondary"
                        className="mb-1 mr-2 text-xs"
                      >
                        {item.type === 'service' ? 'Servis' : 'Produk'}
                      </Badge>
                      <span className="text-sm">{item.name}</span>
                      {item.qty > 1 && (
                        <span className="text-xs text-muted-foreground">
                          {' '}
                          ×{item.qty}
                        </span>
                      )}
                      {item.type === 'service' && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {item.price_max > item.price_min 
                            ? `Estimasi: ${formatPrice(item.price_min)} - ${formatPrice(item.price_max)}`
                            : `Estimasi: ${formatPrice(item.price_min)}`
                          }
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-semibold">
                      {item.type === 'service' ? 'Menunggu Estimasi' : formatPrice(item.price * item.qty)}
                    </span>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-bold text-primary">
                  {hasService ? (
                    productTotal > 0 ? `${formatPrice(productTotal)} + Jasa Servis (Estimasi)` : 'Menunggu Estimasi'
                  ) : (
                    formatPrice(total)
                  )}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Booking & Service Info or Payment Method selection */}
          {hasService ? (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 space-y-2">
                <p className="font-semibold flex items-center gap-2 text-blue-900">
                  <Wrench className="h-5 w-5 text-blue-600" />
                  Booking Servis & Evaluasi Fisik
                </p>
                <p className="text-sm text-blue-800 leading-relaxed">
                  Anda memesan paket servis. Untuk menaksir tindakan atau komponen yang perlu diganti secara akurat, silakan booking dan bawa motor Anda ke bengkel.
                </p>
                <ul className="text-xs text-blue-700 list-disc list-inside space-y-1">
                  <li>Status awal pesanan Anda menjadi <strong>Menunggu Pemeriksaan</strong>.</li>
                  <li>Mekanik akan mendiagnosis kerusakan secara fisik saat motor Anda tiba.</li>
                  <li>Admin/Kasir akan memasukkan rincian tindakan dan sparepart final ke pesanan Anda, lalu mengirimkan tagihan.</li>
                  <li>Anda dapat melakukan pembayaran via Cash/QRIS setelah tagihan dikirim.</li>
                </ul>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Payment Method */}
              <div>
                <h3 className="font-semibold mb-4">Metode Pembayaran</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Cash */}
                  <Card
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      method === 'cash' && 'ring-2 ring-primary'
                    )}
                    onClick={() => {
                      setMethod('cash');
                      setShowQris(false);
                    }}
                  >
                    <CardContent className="p-6 text-center space-y-3">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
                        <Banknote className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold">Cash</p>
                        <p className="text-xs text-muted-foreground">
                          Bayar ke kasir
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* QRIS */}
                  <Card
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      method === 'qris' && 'ring-2 ring-primary'
                    )}
                    onClick={() => setMethod('qris')}
                  >
                    <CardContent className="p-6 text-center space-y-3">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        <QrCode className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold">QRIS</p>
                        <p className="text-xs text-muted-foreground">
                          Scan QR Code
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Info Cash */}
              {method === 'cash' && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <p className="font-semibold mb-2 flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      Pembayaran Cash
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Klik konfirmasi, lalu serahkan pembayaran sebesar{' '}
                      <strong className="text-foreground">
                        {formatPrice(total)}
                      </strong>{' '}
                      langsung ke kasir saat pengambilan kendaraan.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Info QRIS */}
              {method === 'qris' && !showQris && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <p className="font-semibold mb-2 flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      Pembayaran QRIS
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Setelah konfirmasi, QR Code akan ditampilkan. Scan
                      menggunakan aplikasi dompet digital (GoPay, OVO, Dana, dll)
                      dan masukkan nominal{' '}
                      <strong className="text-foreground">
                        {formatPrice(total)}
                      </strong>
                      .
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Confirm Button */}
          {hasService ? (
            <Button
              size="lg"
              className="w-full animate-pulse hover:animate-none"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Mengirim Booking...
                </>
              ) : (
                <>
                  <Wrench className="mr-2 h-5 w-5" />
                  Konfirmasi Booking & Minta Estimasi
                </>
              )}
            </Button>
          ) : (
            method && (
              <Button
                size="lg"
                className="w-full"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Memproses...
                  </>
                ) : method === 'qris' && !showQris ? (
                  <>
                    <QrCode className="mr-2 h-5 w-5" />
                    Lihat QR Code
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Konfirmasi Order
                  </>
                )}
              </Button>
            )
          )}
        </div>
      </div>

      {/* QRIS Dialog */}
      <Dialog open={showQris} onOpenChange={setShowQris}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Scan QRIS</DialogTitle>
            <DialogDescription className="text-center">
              Scan QR code dengan aplikasi dompet digital
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {qrisString && typeof qrisString === 'string' && qrisString.trim() !== '' ? (
              <div className="flex justify-center p-6 bg-white rounded-lg border max-w-[280px] mx-auto">
                <QRCodeSVG
                  value={generateDynamicQRIS(qrisString, total) || `QRIS-BENGKEL-${total}`}
                  size={200}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>
            ) : qrisImageUrl ? (
              <div className="flex justify-center p-3 bg-white rounded-lg border max-w-[280px] mx-auto">
                <img
                  src={qrisImageUrl}
                  alt="QR Code"
                  className="max-h-[300px] w-auto rounded-lg"
                />
              </div>
            ) : (
              <div className="flex justify-center p-6 bg-white rounded-lg border max-w-[280px] mx-auto">
                <QRCodeSVG
                  value={`QRIS-${storeName || 'Bengkel'}-Total-${total}`}
                  size={200}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>
            )}

            <div className="text-center text-sm text-muted-foreground space-y-1">
              <p>Scan QR di atas dengan dompet digital Anda</p>
              <p>(GoPay, OVO, Dana, ShopeePay, dll)</p>
              <p className="font-semibold text-foreground pt-2">
                Masukkan nominal {formatPrice(total)} di aplikasi pembayaran
              </p>
            </div>

            <div className="space-y-2">
              <Button
                size="lg"
                className="w-full"
                onClick={() => submitOrder('qris')}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Sudah Bayar
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full"
                onClick={() => setShowQris(false)}
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
