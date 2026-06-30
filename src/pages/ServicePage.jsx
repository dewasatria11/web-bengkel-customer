import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import { useCart } from '../context/CartContext';
import { ServiceCard } from '@/components/ServiceCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/formatters';
import { ArrowLeft, Loader2, ShoppingCart } from 'lucide-react';

export default function ServicePage() {
  const navigate = useNavigate();
  const { addItem, updateQty, items, count, total } = useCart();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then(({ data, error }) => {
        if (!error) setServices(data || []);
        setLoading(false);
      });
  }, []);

  const getQty = (id) => {
    const it = items.find((i) => i.id === id && i.type === 'service');
    return it ? it.qty : 0;
  };

  const handleQuantityChange = (service, newQty) => {
    const currentQty = getQty(service.id);
    if (newQty === 0 && currentQty > 0) {
      updateQty(service.id, 'service', -currentQty);
    } else if (newQty > currentQty) {
      if (currentQty === 0) {
        addItem({
          id: service.id,
          name: service.name,
          price: 0, // Jasa servis di-set 0 karena menunggu estimasi dari admin
          price_min: service.price,
          price_max: service.price_max,
          type: 'service',
        });
      } else {
        updateQty(service.id, 'service', 1);
      }
    } else if (newQty < currentQty) {
      updateQty(service.id, 'service', -1);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      <div className="container-pos py-6">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/home')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Pilih Jenis Servis</h2>
            <p className="text-sm text-muted-foreground">
              Pilih satu atau lebih paket servis
            </p>
          </div>
        </div>

        {/* Service List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-4">
              Memuat paket servis...
            </p>
          </div>
        ) : services.length === 0 ? (
          <EmptyState
            icon="🔧"
            title="Belum ada paket servis"
            description="Paket servis belum dikonfigurasi oleh admin"
          />
        ) : (
          <div className="space-y-3">
            {services.map((svc) => {
              const qty = getQty(svc.id);
              return (
                <ServiceCard
                  key={svc.id}
                  service={svc}
                  quantity={qty}
                  onQuantityChange={(newQty) =>
                    handleQuantityChange(svc, newQty)
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed Bottom Cart Button */}
      {count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="container-pos">
            <Button
              size="lg"
              className="w-full"
              onClick={() => navigate('/cart')}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Lihat Keranjang ({count}) · {formatPrice(total)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
