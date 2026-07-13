import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PriceDisplay } from '@/components/PriceDisplay';
import { QuantityControl } from '@/components/QuantityControl';
import { formatPrice } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

export function ServiceCard({
  service,
  quantity = 0,
  onQuantityChange,
  className
}) {
  const [detailOpen, setDetailOpen] = useState(false);

  const handleCardClick = () => {
    setDetailOpen(true);
  };

  return (
    <>
      <Card
        className={cn("overflow-hidden hover:shadow-md transition-shadow cursor-pointer", className)}
        onClick={handleCardClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Icon with gradient background */}
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl">
              🔧
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base mb-1">{service.name}</h3>
              {service.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {service.description}
                </p>
              )}
              {service.price_max > service.price ? (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Estimasi Biaya</span>
                  <span className="text-sm font-bold text-primary">
                    {formatPrice(service.price)} - {formatPrice(service.price_max)}
                  </span>
                </div>
              ) : (
                <PriceDisplay amount={service.price} variant="medium" />
              )}
            </div>

            {onQuantityChange && (
              <div onClick={(e) => e.stopPropagation()}>
                <QuantityControl
                  value={quantity}
                  onChange={onQuantityChange}
                />
              </div>
            )}

            {/* Info button to open detail dialog */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setDetailOpen(true);
              }}
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md w-[95%]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl">
                🔧
              </div>
              <DialogTitle className="text-lg font-bold">{service.name}</DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Description */}
            {service.description && (
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Deskripsi</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{service.description}</p>
              </div>
            )}

            {/* Price */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Estimasi Biaya</p>
              {service.price_max > service.price ? (
                <span className="text-lg font-bold text-primary">
                  {formatPrice(service.price)} – {formatPrice(service.price_max)}
                </span>
              ) : (
                <span className="text-lg font-bold text-primary">{formatPrice(service.price)}</span>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                * Harga final ditentukan setelah pengecekan oleh mekanik
              </p>
            </div>

            {/* Quantity control */}
            {onQuantityChange && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium">Jumlah</span>
                <QuantityControl
                  value={quantity}
                  onChange={(newQty) => {
                    onQuantityChange(newQty);
                  }}
                />
              </div>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button onClick={() => setDetailOpen(false)} variant="outline" className="w-full sm:w-auto">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}