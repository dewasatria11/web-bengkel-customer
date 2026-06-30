import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Wrench } from 'lucide-react';

export default function Navbar() {
  const { count } = useCart();
  const { storeName } = useStore();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container-pos">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wrench className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">
              {storeName || 'Bengkel'}
            </span>
          </div>

          {/* Cart Button */}
          <Button
            variant="outline"
            size="icon"
            className="relative"
            onClick={() => navigate('/cart')}
            aria-label="Keranjang belanja"
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <Badge
                variant="default"
                className="absolute -top-2 -right-2 h-5 min-w-5 items-center justify-center rounded-full p-0 text-xs"
              >
                {count > 99 ? '99+' : count}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </nav>
  );
}
