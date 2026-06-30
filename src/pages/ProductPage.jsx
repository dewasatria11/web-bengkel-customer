import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import { useCart } from '../context/CartContext';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatPrice } from '@/lib/formatters';
import { ArrowLeft, Loader2, Search, ShoppingCart, X, ChevronRight, PackageOpen } from 'lucide-react';

// Helper function to extract a general category name from a product name
function getCategory(productName) {
  const name = productName.toLowerCase();
  if (name.includes('busi')) return 'Busi';
  if (name.includes('oli')) return 'Oli Motor';
  if (name.includes('kampas rem') || name.includes('kampar rem')) return 'Kampas Rem';
  if (name.includes('filter')) return 'Filter';
  if (name.includes('v-belt') || name.includes('v belt')) return 'V-Belt';
  if (name.includes('gear')) return 'Gear';
  if (name.includes('lampu')) return 'Lampu';
  
  // Fallback category using first word
  const firstWord = productName.split(' ')[0];
  return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
}

function getProductCategory(product) {
  return product.category || getCategory(product.name);
}

export default function ProductPage() {
  const navigate = useNavigate();
  const { addItem, updateQty, items, count, total } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .gt('stock', 0)
      .order('name')
      .then(({ data, error }) => {
        if (!error) setProducts(data || []);
        setLoading(false);
      });
  }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    getProductCategory(p).toLowerCase().includes(search.toLowerCase())
  );

  // Group products by category
  const categoriesMap = {};
  filtered.forEach((p) => {
    const cat = getProductCategory(p);
    if (!categoriesMap[cat]) {
      categoriesMap[cat] = [];
    }
    categoriesMap[cat].push(p);
  });

  const categories = Object.keys(categoriesMap).map((catName) => ({
    name: catName,
    products: categoriesMap[catName],
  })).sort((a, b) => a.name.localeCompare(b.name));

  const getQty = (id) => {
    const it = items.find((i) => i.id === id && i.type === 'product');
    return it ? it.qty : 0;
  };

  const handleQuantityChange = (product, newQty) => {
    const currentQty = getQty(product.id);
    if (newQty === 0 && currentQty > 0) {
      updateQty(product.id, 'product', -currentQty);
    } else if (newQty > currentQty) {
      if (currentQty === 0) {
        addItem({
          id: product.id,
          name: product.name,
          price: product.price,
          description: product.description,
          type: 'product',
        });
      } else {
        updateQty(product.id, 'product', 1);
      }
    } else if (newQty < currentQty) {
      updateQty(product.id, 'product', -1);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      <div className="container-pos py-6">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Beli Produk</h2>
            <p className="text-sm text-muted-foreground">
              Spare part & produk tersedia
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-10"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setSearch('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Product Categories Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-4">
              Memuat produk...
            </p>
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon="📦"
            title={search ? 'Produk tidak ditemukan' : 'Belum ada produk'}
            description={
              search ? 'Coba kata kunci lain' : 'Produk belum tersedia'
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {categories.map((category) => (
              <Card
                key={category.name}
                className="cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden group"
                onClick={() => setSelectedCategory(category)}
              >
                <CardContent className="p-5 flex flex-col justify-between h-32">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <PackageOpen className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base line-clamp-1">{category.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {category.products.length} pilihan produk
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal/Dialog for list of products under selected category */}
      <Dialog open={!!selectedCategory} onOpenChange={(open) => { if (!open) setSelectedCategory(null); }}>
        <DialogContent className="max-w-md w-[95%] sm:max-w-lg p-6 max-h-[85vh] overflow-y-auto">
          {selectedCategory && (
            <>
              <DialogHeader className="mb-4">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <PackageOpen className="h-5 w-5 text-primary" />
                  {selectedCategory.name}
                </DialogTitle>
                <DialogDescription>
                  Pilih jenis {selectedCategory.name.toLowerCase()} yang Anda butuhkan
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4">
                {selectedCategory.products.map((product) => {
                  const qty = getQty(product.id);
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      quantity={qty}
                      onQuantityChange={(newQty) =>
                        handleQuantityChange(product, newQty)
                      }
                    />
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
