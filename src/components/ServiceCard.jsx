import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PriceDisplay } from '@/components/PriceDisplay';
import { QuantityControl } from '@/components/QuantityControl';
import { formatPrice } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export function ServiceCard({
  service,
  quantity = 0,
  onQuantityChange,
  className
}) {
  return (
    <Card className={cn("overflow-hidden hover:shadow-md transition-shadow", className)}>
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
            <QuantityControl
              value={quantity}
              onChange={onQuantityChange}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
