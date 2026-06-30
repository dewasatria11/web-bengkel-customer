import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useNotifications } from '../../context/NotificationContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { ArrowLeft, Plus, Search, Trash2, Edit2, Loader2, Image as ImageIcon, PackageOpen, ChevronRight } from 'lucide-react';
import { formatPrice } from '../../lib/formatters';

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

const DEFAULT_CATEGORIES = [];

export default function AdminProducts() {
  const navigate = useNavigate();
  const { showToast, showAlert, showConfirm } = useNotifications();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [storeName, setStoreName] = useState('');
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('product_categories') || '[]');
    } catch {
      return [];
    }
  });
  
  // Dialog States
  const [open, setOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({
    id: '',
    name: '',
    category: 'Umum',
    price: 0,
    stock: 0,
    image_url: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError('');
    setSelectedFile(null);

    if (!file) return;

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setFileError('Ukuran file maksimal 5MB.');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setFileError('Format file harus JPG atau PNG.');
      return;
    }

    setSelectedFile(file);
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setProducts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase
      .from('store_profile')
      .select('name')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) setStoreName(data.name);
      });
    fetchProducts();
  }, []);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setForm({
      id: String(Date.now()),
      name: '',
      category: selectedCategory || 'Umum',
      price: 0,
      stock: 0,
      image_url: '',
      description: ''
    });
    setSelectedFile(null);
    setFileError('');
    setOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setForm({
      id: product.id,
      name: product.name,
      category: getProductCategory(product),
      price: product.price,
      stock: product.stock,
      image_url: product.image_url || '',
      description: product.description || ''
    });
    setSelectedFile(null);
    setFileError('');
    setOpen(true);
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    const normalized = newCategory.trim();

    if (!normalized) {
      showToast('Nama kategori tidak boleh kosong.', 'error');
      return;
    }

    const existingCategories = [...DEFAULT_CATEGORIES, ...customCategories].map((cat) => cat.toLowerCase());
    if (existingCategories.includes(normalized.toLowerCase())) {
      showToast('Kategori sudah ada.', 'error');
      return;
    }

    const updatedCategories = [...customCategories, normalized].sort((a, b) => a.localeCompare(b));
    setCustomCategories(updatedCategories);
    localStorage.setItem('ega_garage_product_categories', JSON.stringify(updatedCategories));
    setSelectedCategory(normalized);
    setForm((prev) => ({ ...prev, category: normalized }));
    setNewCategory('');
    setCategoryOpen(false);
  };

  const handleDeleteCategory = async (categoryName, e) => {
    e.stopPropagation();

    const productsInCategory = categoriesMap[categoryName] || [];
    const message = productsInCategory.length > 0
      ? `Kategori "${categoryName}" berisi ${productsInCategory.length} produk. Jika dihapus, produk dalam kategori ini akan dipindahkan ke kategori "Umum". Lanjutkan?`
      : `Apakah Anda yakin ingin menghapus kategori "${categoryName}"?`;

    const confirmed = await showConfirm('Hapus Kategori', message);
    if (!confirmed) return;

    if (productsInCategory.length > 0) {
      const { error } = await supabase
        .from('products')
        .update({ category: 'Umum' })
        .eq('category', categoryName);

      if (error) {
        showToast('Gagal menghapus kategori: ' + error.message, 'error');
        return;
      }
    }

    const updatedCategories = customCategories.filter(
      (category) => category.toLowerCase() !== categoryName.toLowerCase()
    );

    setCustomCategories(updatedCategories);
    localStorage.setItem('ega_garage_product_categories', JSON.stringify(updatedCategories));

    if (selectedCategory === categoryName) {
      setSelectedCategory(null);
    }

    fetchProducts();
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm('Hapus Produk', 'Apakah Anda yakin ingin menghapus produk ini?');
    if (!confirmed) return;
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      showToast('Gagal menghapus produk: ' + error.message, 'error');
    } else {
      showToast('Produk berhasil dihapus', 'success');
      fetchProducts();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fileError) {
      showToast(fileError, 'error');
      return;
    }

    setSubmitting(true);

    let finalImageUrl = form.image_url || null;

    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, selectedFile);

      if (uploadError) {
        showToast('Gagal mengunggah gambar: ' + uploadError.message, 'error');
        setSubmitting(false);
        return;
      }

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);
      
      finalImageUrl = data.publicUrl;
    }

    const payload = {
      id: form.id,
      name: form.name,
      category: form.category || 'Umum',
      price: Number(form.price),
      stock: Number(form.stock),
      image_url: finalImageUrl,
      description: form.description?.trim() || ''
    };

    let error = null;
    if (editingProduct) {
      const { error: err } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id);
      error = err;
    } else {
      const { error: err } = await supabase
        .from('products')
        .insert(payload);
      error = err;
    }

    setSubmitting(false);
    if (error) {
      showToast('Gagal menyimpan produk: ' + error.message, 'error');
    } else {
      showToast('Produk berhasil disimpan', 'success');
      setOpen(false);
      fetchProducts();
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    getProductCategory(p).toLowerCase().includes(search.toLowerCase())
  );

  // Group products by category
  const categoriesMap = {};
  products.forEach((p) => {
    const cat = getProductCategory(p);
    if (!categoriesMap[cat]) {
      categoriesMap[cat] = [];
    }
    categoriesMap[cat].push(p);
  });

  const allCategoryNames = Array.from(new Set([
    ...DEFAULT_CATEGORIES,
    ...customCategories,
    ...Object.keys(categoriesMap),
  ])).sort((a, b) => a.localeCompare(b));

  const categories = allCategoryNames.map((catName) => ({
    name: catName,
    products: categoriesMap[catName] || [],
  }));

  const activeCategoryProducts = selectedCategory ? (categoriesMap[selectedCategory] || []) : [];

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Kelola Produk & Stock</h1>
              <p className="text-xs text-muted-foreground">{storeName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCategoryOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Tambah Kategori
            </Button>
            <Button onClick={handleOpenAdd} className="gap-2">
              <Plus className="h-4 w-4" /> Tambah Produk
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Product Cards or Category Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : search ? (
          /* Search results layout */
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-4">Hasil Pencarian untuk "{search}"</h2>
            {filtered.length === 0 ? (
              <div className="text-center py-12 bg-background border rounded-lg">
                <p className="text-muted-foreground">Tidak ada produk ditemukan.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((product) => (
                  <Card key={product.id} className="overflow-hidden bg-background shadow-sm hover:shadow-md transition-shadow">
                    <div className="aspect-video bg-muted relative flex items-center justify-center overflow-hidden border-b">
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
                          <ImageIcon className="h-10 w-10 mb-2" />
                          <span className="text-xs">Tidak ada gambar</span>
                        </div>
                      )}
                      <span className="absolute top-2 right-2 bg-primary/95 text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded">
                        Stok: {product.stock}
                      </span>
                    </div>
                    <CardContent className="p-5">
                      <div className="mb-4">
                        <h3 className="font-bold text-lg line-clamp-1">{product.name}</h3>
                        {product.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                        <p className="text-primary font-semibold mt-1">{formatPrice(product.price)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => handleOpenEdit(product)}>
                          <Edit2 className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button variant="destructive" size="sm" className="gap-1" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : selectedCategory ? (
          /* Products within selected category layout */
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Button variant="outline" size="sm" onClick={() => setSelectedCategory(null)}>
                &larr; Kembali ke Kategori
              </Button>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <PackageOpen className="h-5 w-5 text-primary" />
                {selectedCategory} ({activeCategoryProducts.length})
              </h2>
            </div>

            {activeCategoryProducts.length === 0 ? (
              <div className="text-center py-12 bg-background border rounded-lg">
                <p className="text-muted-foreground">Tidak ada produk dalam kategori ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeCategoryProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden bg-background shadow-sm hover:shadow-md transition-shadow">
                    <div className="aspect-video bg-muted relative flex items-center justify-center overflow-hidden border-b">
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
                          <ImageIcon className="h-10 w-10 mb-2" />
                          <span className="text-xs">Tidak ada gambar</span>
                        </div>
                      )}
                      <span className="absolute top-2 right-2 bg-primary/95 text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded">
                        Stok: {product.stock}
                      </span>
                    </div>
                    <CardContent className="p-5">
                      <div className="mb-4">
                        <h3 className="font-bold text-lg line-clamp-1">{product.name}</h3>
                        {product.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                        <p className="text-primary font-semibold mt-1">{formatPrice(product.price)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => handleOpenEdit(product)}>
                          <Edit2 className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button variant="destructive" size="sm" className="gap-1" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Categories Grid Layout (Default) */
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-4">Kategori Produk</h2>
            {categories.length === 0 ? (
              <div className="text-center py-12 bg-background border rounded-lg">
                <p className="text-muted-foreground">Belum ada produk.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {categories.map((category) => (
                  <Card
                    key={category.name}
                    className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all relative overflow-hidden group bg-background"
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 z-10 h-8 w-8 opacity-90 hover:opacity-100"
                      title={`Hapus kategori ${category.name}`}
                      onClick={(e) => handleDeleteCategory(category.name, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <CardContent className="p-5 flex flex-col justify-between h-32">
                      <div className="flex items-center justify-between">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <PackageOpen className="h-5 w-5" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-base line-clamp-1 text-foreground">{category.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {category.products.length} produk
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog Tambah Kategori */}
      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent className="max-w-md w-[95%] p-6">
          <DialogHeader>
            <DialogTitle>Tambah Kategori</DialogTitle>
            <DialogDescription>
              Buat kategori produk baru agar produk lebih mudah dikelompokkan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCategory} className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="new-category">Nama Kategori</Label>
              <Input
                id="new-category"
                required
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Contoh: Ban Motor"
              />
            </div>
            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setCategoryOpen(false)}>
                Batal
              </Button>
              <Button type="submit">
                Simpan Kategori
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Form */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md w-[95%] sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
            <DialogDescription>
              Isi data detail produk di bawah ini.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="name">Nama Produk</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Oli Yamalube Matic 1Ltr"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="category">Kategori</Label>
              <Input
                id="category"
                list="product-categories"
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Contoh: Oli Motor"
              />
              <datalist id="product-categories">
                {allCategoryNames.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              <p className="text-[11px] text-muted-foreground leading-normal mt-1">
                Pilih kategori yang sudah ada atau ketik kategori baru.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Deskripsi / Spesifikasi Produk</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Contoh: Oli full synthetic 10W-40, cocok untuk motor matic, volume 1 liter."
                rows={4}
                className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-[11px] text-muted-foreground leading-normal mt-1">
                Isi detail spesifikasi produk agar customer lebih mudah memahami produk.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="price">Harga (Rp)</Label>
                <Input
                  id="price"
                  type="number"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="85000"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stock">Stok</Label>
                <Input
                  id="stock"
                  type="number"
                  required
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="10"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="product-image">Gambar Produk</Label>
              <Input
                id="product-image"
                type="file"
                accept="image/jpeg, image/png, image/jpg"
                onChange={handleFileChange}
                className={fileError ? 'border-destructive' : ''}
              />
              {fileError && (
                <p className="text-xs text-destructive mt-1 font-medium">{fileError}</p>
              )}
              {form.image_url && !selectedFile && (
                <div className="mt-2 text-xs flex items-center gap-2 text-muted-foreground bg-muted p-2 rounded">
                  <ImageIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">Gambar saat ini terunggah</span>
                </div>
              )}
              {selectedFile && (
                <p className="text-xs text-emerald-600 mt-1 font-medium">
                  File terpilih: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
              <p className="text-[11px] text-muted-foreground leading-normal mt-1">
                Format yang diperbolehkan: JPG atau PNG (Maksimal 5MB).
              </p>
            </div>

            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}