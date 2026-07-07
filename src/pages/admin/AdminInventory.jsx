import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  Boxes,
  CheckCircle2,
  ClipboardEdit,
  Loader2,
  PackageCheck,
  PackageX,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  Warehouse
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useNotifications } from '../../context/NotificationContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { formatPrice } from '../../lib/formatters';

const LOW_STOCK_LIMIT = 5;

function getStockStatus(stock) {
  const safeStock = Number(stock) || 0;

  if (safeStock <= 0) {
    return {
      label: 'Kosong',
      className: 'bg-red-500/10 text-red-600 border-red-500/20',
      icon: PackageX
    };
  }

  if (safeStock <= LOW_STOCK_LIMIT) {
    return {
      label: 'Stok Rendah',
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      icon: TriangleAlert
    };
  }

  return {
    label: 'Aman',
    className: 'bg-green-500/10 text-green-600 border-green-500/20',
    icon: CheckCircle2
  };
}

function getProductCategory(product) {
  return product.category || 'Umum';
}

export default function AdminInventory() {
  const navigate = useNavigate();
  const { showToast, showConfirm } = useNotifications();

  const [products, setProducts] = useState([]);
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('stock_asc');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockForm, setStockForm] = useState({
    mode: 'in',
    quantity: 1,
    notes: ''
  });

  const fetchInventory = async () => {
    setLoading(true);

    const [productsRes, storeRes] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, category, price, stock, description, image_url, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('store_profile')
        .select('name')
        .eq('id', 1)
        .maybeSingle()
    ]);

    if (productsRes.error) {
      showToast('Gagal memuat inventory: ' + productsRes.error.message, 'error');
      setProducts([]);
    } else {
      setProducts(productsRes.data || []);
    }

    if (storeRes.data?.name) {
      setStoreName(storeRes.data.name);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const emptyStock = products.filter((p) => Number(p.stock) <= 0).length;
    const lowStock = products.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= LOW_STOCK_LIMIT).length;
    const safeStock = products.filter((p) => Number(p.stock) > LOW_STOCK_LIMIT).length;
    const categoriesCount = new Set(products.map((p) => getProductCategory(p))).size;
    const totalStockValue = products.reduce((sum, product) => {
      return sum + ((Number(product.price) || 0) * (Number(product.stock) || 0));
    }, 0);

    return {
      totalProducts,
      emptyStock,
      lowStock,
      safeStock,
      categoriesCount,
      totalStockValue
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    let data = products.filter((product) => {
      const stock = Number(product.stock) || 0;
      const matchesSearch =
        product.name?.toLowerCase().includes(keyword) ||
        getProductCategory(product).toLowerCase().includes(keyword) ||
        product.description?.toLowerCase().includes(keyword);

      const matchesFilter =
        filter === 'all' ||
        (filter === 'empty' && stock <= 0) ||
        (filter === 'low' && stock > 0 && stock <= LOW_STOCK_LIMIT) ||
        (filter === 'safe' && stock > LOW_STOCK_LIMIT);

      return matchesSearch && matchesFilter;
    });

    data = [...data].sort((a, b) => {
      const stockA = Number(a.stock) || 0;
      const stockB = Number(b.stock) || 0;
      const valueA = (Number(a.price) || 0) * stockA;
      const valueB = (Number(b.price) || 0) * stockB;

      if (sortBy === 'stock_desc') return stockB - stockA;
      if (sortBy === 'value_desc') return valueB - valueA;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);

      return stockA - stockB;
    });

    return data;
  }, [products, search, filter, sortBy]);

  const openStockDialog = (product, mode) => {
    setSelectedProduct(product);
    setStockForm({
      mode,
      quantity: 1,
      notes: ''
    });
    setDialogOpen(true);
  };

  const calculateNewStock = () => {
    if (!selectedProduct) return 0;

    const currentStock = Number(selectedProduct.stock) || 0;
    const quantity = Math.max(0, Number(stockForm.quantity) || 0);

    if (stockForm.mode === 'in') return currentStock + quantity;
    if (stockForm.mode === 'out') return Math.max(0, currentStock - quantity);

    return quantity;
  };

  const handleSubmitStock = async (e) => {
    e.preventDefault();

    if (!selectedProduct) return;

    const quantity = Number(stockForm.quantity);

    if (Number.isNaN(quantity) || quantity < 0) {
      showToast('Jumlah stok tidak valid.', 'error');
      return;
    }

    if (stockForm.mode !== 'set' && quantity <= 0) {
      showToast('Jumlah stok harus lebih dari 0.', 'error');
      return;
    }

    const currentStock = Number(selectedProduct.stock) || 0;

    if (stockForm.mode === 'out' && quantity > currentStock) {
      const confirmed = await showConfirm(
        'Stok Keluar Melebihi Stok',
        `Stok saat ini hanya ${currentStock}. Jika dilanjutkan, stok akan menjadi 0. Lanjutkan?`
      );

      if (!confirmed) return;
    }

    const newStock = calculateNewStock();

    setSubmitting(true);

    const { error } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', selectedProduct.id);

    setSubmitting(false);

    if (error) {
      showToast('Gagal update stok: ' + error.message, 'error');
      return;
    }

    const actionLabel = stockForm.mode === 'in'
      ? 'Stok masuk berhasil dicatat'
      : stockForm.mode === 'out'
        ? 'Stok keluar berhasil dicatat'
        : 'Stok berhasil disesuaikan';

    showToast(actionLabel, 'success');
    setDialogOpen(false);
    fetchInventory();
  };

  const filterOptions = [
    { value: 'all', label: 'Semua' },
    { value: 'empty', label: 'Stok Kosong' },
    { value: 'low', label: 'Stok Rendah' },
    { value: 'safe', label: 'Stok Aman' }
  ];

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <div className="bg-background border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Inventory / Stok Barang</h1>
            <p className="text-xs text-muted-foreground">
              {storeName || 'Dashboard stok'} • Pantau stok, restock, dan barang kosong
            </p>
          </div>
          <Button variant="outline" onClick={fetchInventory} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Warehouse className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-background shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
                <p className="text-xs text-muted-foreground">Total Produk</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                <PackageX className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.emptyStock}</p>
                <p className="text-xs text-muted-foreground">Stok Kosong</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <TriangleAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.lowStock}</p>
                <p className="text-xs text-muted-foreground">Stok Rendah</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                <PackageCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.safeStock}</p>
                <p className="text-xs text-muted-foreground">Stok Aman</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background shadow-sm col-span-2 lg:col-span-1">
            <CardContent className="p-5">
              <p className="text-lg font-bold text-primary">{formatPrice(stats.totalStockValue)}</p>
              <p className="text-xs text-muted-foreground">Estimasi Nilai Stok</p>
              <p className="text-[11px] text-muted-foreground mt-1">{stats.categoriesCount} kategori aktif</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-background shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Filter Inventory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari nama produk, kategori, atau deskripsi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="stock_asc">Stok terendah</option>
                <option value="stock_desc">Stok tertinggi</option>
                <option value="value_desc">Nilai stok terbesar</option>
                <option value="name_asc">Nama A-Z</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={filter === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background shadow-sm overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="text-base">Daftar Stok Barang ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 px-4">
                <PackageX className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="font-semibold">Data stok tidak ditemukan</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Coba ubah pencarian atau filter inventory.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="text-left font-semibold px-4 py-3 min-w-[240px]">Produk</th>
                      <th className="text-left font-semibold px-4 py-3">Kategori</th>
                      <th className="text-right font-semibold px-4 py-3">Harga</th>
                      <th className="text-center font-semibold px-4 py-3">Stok</th>
                      <th className="text-right font-semibold px-4 py-3">Nilai Stok</th>
                      <th className="text-center font-semibold px-4 py-3">Status</th>
                      <th className="text-right font-semibold px-4 py-3 min-w-[260px]">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const stock = Number(product.stock) || 0;
                      const price = Number(product.price) || 0;
                      const stockValue = stock * price;
                      const status = getStockStatus(stock);
                      const StatusIcon = status.icon;

                      return (
                        <tr key={product.id} className="border-t hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-4">
                            <div className="font-semibold text-foreground">{product.name}</div>
                            {product.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                {product.description}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {getProductCategory(product)}
                          </td>
                          <td className="px-4 py-4 text-right font-medium">
                            {formatPrice(price)}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-lg font-bold">{stock}</span>
                          </td>
                          <td className="px-4 py-4 text-right font-semibold">
                            {formatPrice(stockValue)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-center">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                                <StatusIcon className="h-3.5 w-3.5" />
                                {status.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-green-600 hover:text-green-700"
                                onClick={() => openStockDialog(product, 'in')}
                              >
                                <ArrowUpCircle className="h-3.5 w-3.5" />
                                Masuk
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-amber-600 hover:text-amber-700"
                                onClick={() => openStockDialog(product, 'out')}
                              >
                                <ArrowDownCircle className="h-3.5 w-3.5" />
                                Keluar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => openStockDialog(product, 'set')}
                              >
                                <ClipboardEdit className="h-3.5 w-3.5" />
                                Set
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md w-[95%] p-6">
          <DialogHeader>
            <DialogTitle>Update Stok Barang</DialogTitle>
            <DialogDescription>
              {selectedProduct?.name || 'Pilih produk'} • Stok saat ini: {selectedProduct?.stock ?? 0}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitStock} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipe Update</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={stockForm.mode === 'in' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStockForm((prev) => ({ ...prev, mode: 'in' }))}
                >
                  Masuk
                </Button>
                <Button
                  type="button"
                  variant={stockForm.mode === 'out' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStockForm((prev) => ({ ...prev, mode: 'out' }))}
                >
                  Keluar
                </Button>
                <Button
                  type="button"
                  variant={stockForm.mode === 'set' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStockForm((prev) => ({ ...prev, mode: 'set' }))}
                >
                  Set Stok
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="quantity">
                {stockForm.mode === 'set' ? 'Stok Baru' : 'Jumlah'}
              </Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                required
                value={stockForm.quantity}
                onChange={(e) => setStockForm((prev) => ({ ...prev, quantity: e.target.value }))}
              />
              <p className="text-[11px] text-muted-foreground">
                Stok setelah update: <span className="font-semibold text-foreground">{calculateNewStock()}</span>
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Catatan Opsional</Label>
              <textarea
                id="notes"
                value={stockForm.notes}
                onChange={(e) => setStockForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Contoh: Restock supplier, barang rusak, penyesuaian audit..."
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
              <p className="text-[11px] text-muted-foreground">
                Catatan ini untuk dokumentasi internal. Versi saat ini belum menyimpan histori log.
              </p>
            </div>

            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Simpan Stok'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}