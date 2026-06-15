import React from 'react';
import { formatPrice } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export function PriceDisplay({ amount, variant = 'medium', className }) {
  const variantClasses = {
    small: 'text-base font-semibold',
    medium: 'text-lg font-bold',
    large: 'text-2xl font-bold',
  };

  return (
    <span className={cn(variantClasses[variant], className)}>
      {formatPrice(amount)}
    </span>
  );
}
