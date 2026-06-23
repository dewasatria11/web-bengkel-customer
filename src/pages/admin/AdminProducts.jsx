import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { ArrowLeft, Plus, Search, Trash2, Edit2, Loader2, Image as ImageIcon } from 'lucide-react';
import { formatPrice } from '../../lib/formatters';

export default function AdminProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Dialog States
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({
    id: '',
    name: '',
    price: 0,
    stock: 0,
    image_url: ''
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
    fetchProducts();
  }, []);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setForm({
      id: String(Date.now()),
      name: '',
      price: 0,
      stock: 0,
      image_url: ''
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
      price: product.price,
      stock: product.stock,
      image_url: product.image_url || ''
    });
    setSelectedFile(null);
    setFileError('');
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Gagal menghapus produk: ' + error.message);
    } else {
      fetchProducts();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fileError) {
      alert(fileError);
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
        alert('Gagal mengunggah gambar: ' + uploadError.message);
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
      price: Number(form.price),
      stock: Number(form.stock),
      image_url: finalImageUrl
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
      alert('Gagal menyimpan produk: ' + error.message);
    } else {
      setOpen(false);
      fetchProducts();
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

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
              <p className="text-xs text-muted-foreground">EGA GARAGE</p>
            </div>
          </div>
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Tambah Produk
          </Button>
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

        {/* Product Cards Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
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