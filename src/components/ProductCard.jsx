import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PriceDisplay } from '@/components/PriceDisplay';
import { QuantityControl } from '@/components/QuantityControl';
import { cn } from '@/lib/utils';

export function ProductCard({
  product,
  quantity = 0,
  onQuantityChange,
  className
}) {
  return (
    <Card className={cn("overflow-hidden hover:shadow-md transition-shadow", className)}>
      <div className="aspect-[3/1] bg-muted relative flex items-center justify-center overflow-hidden border-b sm:aspect-video">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=500';
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground/60 p-4">
            <span className="text-xs">Tidak ada gambar</span>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-base mb-1">{product.name}</h3>
              <PriceDisplay amount={product.price} variant="medium" />
            </div>
            {product.stock !== undefined && (
              <Badge variant={product.stock > 0 ? "secondary" : "destructive"} className="ml-2">
                {product.stock > 0 ? `Stok: ${product.stock}` : 'Habis'}
              </Badge>
            )}
          </div>

          {product.stock > 0 && onQuantityChange && (
            <QuantityControl
              value={quantity}
              onChange={onQuantityChange}
              max={product.stock}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
