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
