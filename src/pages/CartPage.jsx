import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Navbar from '../components/Navbar';
import { EmptyState } from '@/components/EmptyState';
import { QuantityControl } from '@/components/QuantityControl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatPrice } from '@/lib/formatters';
import { ArrowLeft, Trash2, Wrench, Package } from 'lucide-react';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, updateQty, removeItem, total, count, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container-pos py-6">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-bold">Keranjang</h2>
          </div>
          <EmptyState
            icon="🛒"
            title="Keranjang kosong"
            description="Tambahkan servis atau produk terlebih dahulu"
            action={() => navigate('/home')}
            actionLabel="Pilih Layanan"
          />
        </div>
      </div>
    );
  }

  const serviceItems = items.filter((i) => i.type === 'service');
  const productItems = items.filter((i) => i.type === 'product');

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
            <h2 className="text-xl font-bold">Keranjang</h2>
            <p className="text-sm text-muted-foreground">{count} item dipilih</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Cart Items Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service Items */}
            {serviceItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Paket Servis</h3>
                </div>
                {serviceItems.map((item) => (
                  <Card
                    key={`${item.id}-${item.type}`}
                    className="border-l-4 border-l-green-500"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <Badge variant="secondary" className="mb-2">
                            Servis
                          </Badge>
                          <h4 className="font-semibold mb-1">{item.name}</h4>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <p className="text-sm font-bold text-primary">
                            {item.price_max > item.price_min 
                              ? `Estimasi: ${formatPrice(item.price_min)} - ${formatPrice(item.price_max)}`
                              : `Estimasi: ${formatPrice(item.price_min)}`
                            }
                          </p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <QuantityControl
                            value={item.qty}
                            onChange={(newQty) => {
                              const diff = newQty - item.qty;
                              updateQty(item.id, 'service', diff);
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeItem(item.id, 'service')}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Hapus
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Product Items */}
            {productItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Produk</h3>
                </div>
                {productItems.map((item) => (
                  <Card
                    key={`${item.id}-${item.type}`}
                    className="border-l-4 border-l-blue-500"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <Badge variant="secondary" className="mb-2">
                            Produk
                          </Badge>
                          <h4 className="font-semibold mb-1">{item.name}</h4>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <p className="text-lg font-bold text-primary">
                            {formatPrice(item.price * item.qty)}
                          </p>
                          {item.qty > 1 && (
                            <p className="text-sm text-muted-foreground">
                              {formatPrice(item.price)} × {item.qty}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <QuantityControl
                            value={item.qty}
                            onChange={(newQty) => {
                              const diff = newQty - item.qty;
                              updateQty(item.id, 'product', diff);
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeItem(item.id, 'product')}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Hapus
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Clear Cart */}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={clearCart}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Kosongkan Keranjang
            </Button>
          </div>

          {/* Right Column / Fixed Bottom on Mobile */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {/* Desktop Summary Card */}
              <Card className="hidden lg:block border-2 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-4">Ringkasan Pesanan</h3>
                  
                  <div className="space-y-3 text-sm pt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Item</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    {productItems.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal Produk</span>
                        <span className="font-medium">{formatPrice(productItems.reduce((s, i) => s + i.price * i.qty, 0))}</span>
                      </div>
                    )}
                    {serviceItems.length > 0 && (
                      <div className="flex justify-between text-muted-foreground italic">
                        <span>Biaya Servis</span>
                        <span>Menunggu Estimasi</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between pt-2">
                    <span className="font-bold">Total Pembayaran</span>
                    <span className="text-xl font-bold text-primary text-right">
                      {serviceItems.length > 0 ? (
                        productItems.length > 0 ? (
                          `${formatPrice(productItems.reduce((s, i) => s + i.price * i.qty, 0))} + Servis`
                        ) : (
                          'Menunggu Estimasi'
                        )
                      ) : (
                        formatPrice(total)
                      )}
                    </span>
                  </div>

                  <Button
                    size="lg"
                    className="w-full mt-6"
                    onClick={() => navigate('/payment')}
                  >
                    {serviceItems.length > 0 ? 'Lanjut Booking & Estimasi →' : 'Lanjut Bayar →'}
                  </Button>
                </CardContent>
              </Card>

              {/* Mobile Fixed Bottom Summary (Hidden on Desktop) */}
              <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 lg:hidden z-10">
                <div className="container-pos space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold">
                      {serviceItems.length > 0 ? (
                        productItems.length > 0 ? (
                          `${formatPrice(productItems.reduce((s, i) => s + i.price * i.qty, 0))} + Srv`
                        ) : (
                          'Menunggu Estimasi'
                        )
                      ) : (
                        formatPrice(total)
                      )}
                    </span>
                  </div>
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => navigate('/payment')}
                  >
                    {serviceItems.length > 0 ? 'Booking & Estimasi →' : 'Lanjut Bayar →'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
