import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { ArrowLeft, Loader2, CheckCircle, XCircle, Clock, Check, Eye, User, RefreshCw, Trash2, Calendar, Filter, X } from 'lucide-react';
import { formatPrice } from '../../lib/formatters';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [storeName, setStoreName] = useState('EGA GARAGE');
  const [mechanics, setMechanics] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [selectedMechanics, setSelectedMechanics] = useState({}); // orderId -> mechanic object

  // Edit Items States
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [editingItemsList, setEditingItemsList] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemType, setNewItemType] = useState('product');

  // Date Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (selectedOrder) {
      setEditingItemsList(selectedOrder.items || []);
      setIsEditingItems(false);
      
      // Pre-select mechanic if already assigned
      if (selectedOrder.mechanic_id) {
        const currentMech = mechanics.find(m => m.id === selectedOrder.mechanic_id);
        if (currentMech) {
          setSelectedMechanics(prev => ({
            ...prev,
            [selectedOrder.id]: currentMech
          }));
        }
      }
    }
  }, [selectedOrder, mechanics]);


  const fetchOrders = async () => {
    setLoading(true);
    
    let query = supabase
      .from('web_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (startDate) {
      // Use local timezone start of day in ISO string format
      query = query.gte('created_at', `${startDate}T00:00:00.000`);
    }
    if (endDate) {
      // Use local timezone end of day in ISO string format
      query = query.lte('created_at', `${endDate}T23:59:59.999`);
    }

    const { data, error } = await query;

    if (!error) {
      setOrders(data || []);
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
    fetchMechanics();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [startDate, endDate]);


  const fetchMechanics = async () => {
    const { data } = await supabase
      .from('mechanics')
      .select('id, name, is_active')
      .eq('is_active', true)
      .order('name');
    setMechanics(data || []);
  };

  const autoAssignMechanic = async (orderId) => {
    const { data: busyOrders } = await supabase
      .from('web_orders')
      .select('mechanic_id')
      .eq('status', 'confirmed');
    const busyIds = new Set((busyOrders || []).map(o => o.mechanic_id).filter(Boolean));
    const { data: available } = await supabase
      .from('mechanics')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    const free = (available || []).find(m => !busyIds.has(m.id));
    if (!free) {
      alert('Tidak ada mekanik tersedia saat ini. Semua mekanik sedang sibuk.');
      return null;
    }
    const { error } = await supabase
      .from('web_orders')
      .update({ mechanic_id: free.id, mechanic_name: free.name })
      .eq('id', orderId);
    if (error) {
      console.error('Gagal assign mekanik:', error);
      alert('Gagal assign mekanik: ' + error.message);
      return null;
    }
    return free;
  };
  const handleUpdateStatus = async (orderId, newStatus) => {
    const { error } = await supabase
      .from('web_orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      alert('Gagal memperbarui status: ' + error.message);
    } else {
      fetchOrders();
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus pesanan ini secara permanen dari database?')) {
      return;
    }
    const { error } = await supabase
      .from('web_orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      alert('Gagal menghapus pesanan: ' + error.message);
    } else {
      alert('Pesanan berhasil dihapus.');
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(null);
      }
    }
  };

  const handleMarkAsRead = async (order) => {
    setSelectedOrder(order);
    if (!order.is_read_by_admin) {
      const { error } = await supabase
        .from('web_orders')
        .update({ is_read_by_admin: true })
        .eq('id', order.id);

      if (!error) {
        setOrders(prev =>
          prev.map(o => (o.id === order.id ? { ...o, is_read_by_admin: true } : o))
        );
      }
    }
  };

  const getStatusBadge = (order) => {
    if (!order) return null;
    const status = order.status;
const hasService = order.order_type === 'service' || order.order_type === 'mixed' || (Array.isArray(order.items) && order.items.some(i => i.type === 'service'));
    if (status === 'pending') {
      if (hasService) {
        if (!order.mechanic_id) {
          return <span className="bg-orange-100 text-orange-800 text-xs px-2.5 py-1 rounded-full font-semibold">Menunggu Pemeriksaan</span>;
        } else {
          return <span className="bg-indigo-100 text-indigo-800 text-xs px-2.5 py-1 rounded-full font-semibold">Menunggu Pembayaran</span>;
        }
      }
      return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-semibold">Menunggu Konfirmasi</span>;
    }
    if (status === 'confirmed') {
      return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-semibold">Dikonfirmasi / Proses</span>;
    }
    if (status === 'done') {
      return <span className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full font-semibold">Selesai</span>;
    }
    if (status === 'cancelled') {
      return <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-semibold">Dibatalkan</span>;
    }
    return <span className="bg-muted text-muted-foreground text-xs px-2.5 py-1 rounded-full font-semibold">{status}</span>;
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Kelola Pesanan Pelanggan</h1>
              <p className="text-xs text-muted-foreground">{storeName}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-md border">
              <Calendar className="h-4 w-4 text-muted-foreground ml-2" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-sm outline-none cursor-pointer"
              />
              <span className="text-muted-foreground text-sm">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-sm outline-none cursor-pointer"
              />
              {(startDate || endDate) && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 ml-1 text-muted-foreground hover:text-foreground" 
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  title="Clear Filter"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={fetchOrders} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-background border rounded-lg">
            <p className="text-muted-foreground">Belum ada pesanan masuk.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card 
                key={order.id} 
                className={`bg-background shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${
                  !order.is_read_by_admin ? 'border-l-4 border-l-destructive' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-muted-foreground">
                          ID: ...{order.id.slice(-8).toUpperCase()}
                        </span>
                        {!order.is_read_by_admin && (
                          <span className="bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0.5 rounded font-bold animate-pulse">
                            BARU
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-lg">{order.customer_name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {order.customer_phone} · {order.customer_motor}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Metode: <span className="font-semibold uppercase">{order.payment_method}</span>
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total Transaksi</p>
                        <p className="text-primary font-bold text-lg">
                          {order.status === 'pending' && (order.order_type === 'service' || order.order_type === 'mixed') && !order.mechanic_id ? 'Menunggu Estimasi' : formatPrice(order.total)}
                        </p>
                      </div>
                      {getStatusBadge(order)}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-t pt-4 gap-4">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(order.created_at).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => handleMarkAsRead(order)}>
                        <Eye className="h-3.5 w-3.5" /> Detail
                      </Button>

                      {order.status === 'pending_inspection' && (
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700 text-white gap-1"
                          onClick={() => handleMarkAsRead(order)}
                        >
                          <Clock className="h-3.5 w-3.5" /> Periksa & Edit Biaya
                        </Button>
                      )}
                      
                      {order.status === 'pending' && (
                        <>
                          {/* Service/mixed orders: guide admin to use detail dialog for inspection & invoice */}
                          {(order.order_type === 'service' || order.order_type === 'mixed' || (Array.isArray(order.items) && order.items.some(i => i.type === 'service'))) ? (
                            <>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="gap-1"
                                onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                              >
                                Tolak
                              </Button>
                            </>
                          ) : (
                            /* Product orders: show mechanic selector + Konfirmasi */
                            <>
                              <div className="w-[140px] shrink-0">
                                <Select
                                  value={selectedMechanics[order.id]?.id || ''}
                                  onValueChange={(val) => {
                                    const mech = mechanics.find((m) => m.id === val);
                                    if (mech) {
                                      setSelectedMechanics((prev) => ({
                                        ...prev,
                                        [order.id]: mech,
                                      }));
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-full h-9">
                                    <SelectValue placeholder="Pilih Mekanik" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {mechanics.map((mech) => (
                                      <SelectItem key={mech.id} value={mech.id}>
                                        {mech.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <Button 
                                variant="default" 
                                size="sm" 
                                className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                                onClick={async () => {
                                  const mech = selectedMechanics[order.id];
                                  if (!mech) {
                                    alert('Silakan pilih mekanik terlebih dahulu.');
                                    return;
                                  }
                                  setAssigning(true);
                                  const { error } = await supabase
                                    .from('web_orders')
                                    .update({
                                      status: 'confirmed',
                                      mechanic_id: mech.id,
                                      mechanic_name: mech.name,
                                    })
                                    .eq('id', order.id);
                                  if (error) {
                                    alert('Gagal mengkonfirmasi pesanan: ' + error.message);
                                  } else {
                                    fetchOrders();
                                  }
                                  setAssigning(false);
                                }}
                                disabled={assigning}
                              >
                                <Check className="h-3.5 w-3.5" /> Konfirmasi
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="gap-1"
                                onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                              >
                                Tolak
                              </Button>
                            </>
                          )}
                        </>
                      )}

                      {order.status === 'confirmed' && (
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-white gap-1"
                          onClick={() => handleUpdateStatus(order.id, 'done')}
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Selesai
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleDeleteOrder(order.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Hapus
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent className="max-w-md w-[95%] sm:max-w-lg p-6 max-h-[85vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader className="mb-4">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  Detail Pesanan Pelanggan
                </DialogTitle>
                <DialogDescription>
                  ID Pesanan: {selectedOrder.id}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Customer Section */}
                <div className="bg-muted/40 p-4 rounded-lg space-y-2">
                  <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">Data Pelanggan</h4>
                  <div className="grid grid-cols-2 text-xs gap-y-1">
                    <span className="text-muted-foreground">Nama Pelanggan</span>
                    <span className="font-semibold text-right">{selectedOrder.customer_name}</span>
                    <span className="text-muted-foreground">No Telepon</span>
                    <span className="font-semibold text-right">{selectedOrder.customer_phone}</span>
                    <span className="text-muted-foreground">Motor / Plat</span>
                    <span className="font-semibold text-right">{selectedOrder.customer_motor}</span>
                    <span className="text-muted-foreground">Metode Pembayaran</span>
                    <span className="font-semibold text-right uppercase">{selectedOrder.payment_method}</span>
                    <span className="text-muted-foreground">Status Pembayaran</span>
                    <span className="font-semibold text-right">{getStatusBadge(selectedOrder)}</span>
                    {selectedOrder.mechanic_name && (
                      <>
                        <span className="text-muted-foreground">Mekanik Terpilih</span>
                        <span className="font-bold text-right text-primary">{selectedOrder.mechanic_name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Items Section */}
                {!isEditingItems ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">Item Dipesan</h4>
                      {(selectedOrder.status === 'pending_inspection' || selectedOrder.status === 'confirmed' || selectedOrder.status === 'pending_payment' || selectedOrder.status === 'pending') && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-xs px-2"
                          onClick={() => {
                            setEditingItemsList(selectedOrder.items || []);
                            setIsEditingItems(true);
                          }}
                        >
                          Edit Item & Biaya
                        </Button>
                      )}
                    </div>
                    <div className="border rounded-lg overflow-hidden divide-y">
                      {(selectedOrder.items || []).map((item, index) => (
                        <div key={index} className="p-3 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-foreground">{item.name}</p>
                            <p className="text-muted-foreground">
                              {item.type === 'service' && item.price === 0 ? (
                                item.price_max > item.price_min 
                                  ? `Estimasi: ${formatPrice(item.price_min)} - ${formatPrice(item.price_max)}`
                                  : `Estimasi: ${formatPrice(item.price_min)}`
                              ) : (
                                `${formatPrice(item.price)} x ${item.qty}`
                              )}
                            </p>
                          </div>
                          <span className="font-bold text-foreground">
                            {item.type === 'service' && item.price === 0 ? 'Menunggu Estimasi' : formatPrice(item.price * item.qty)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg border">
                      <span className="font-bold text-sm">Total Bayar</span>
                      <span className="font-bold text-primary text-base">
                        {selectedOrder.status === 'pending_inspection' && selectedOrder.total === 0 ? 'Menunggu Estimasi' : formatPrice(selectedOrder.total)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">Edit Item Pesanan</h4>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {editingItemsList.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center border p-2 rounded bg-muted/20">
                          <div className="flex-1 space-y-1">
                            <input 
                              className="w-full text-xs font-semibold bg-background border rounded px-2 py-1 h-8"
                              value={item.name} 
                              onChange={(e) => {
                                const updated = [...editingItemsList];
                                updated[idx].name = e.target.value;
                                setEditingItemsList(updated);
                              }} 
                              placeholder="Nama Item"
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">Harga</span>
                                <input 
                                  type="number"
                                  className="w-full text-xs bg-background border rounded px-2 py-0.5 h-7"
                                  value={item.price} 
                                  onChange={(e) => {
                                    const updated = [...editingItemsList];
                                    updated[idx].price = Number(e.target.value);
                                    setEditingItemsList(updated);
                                  }} 
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">Qty</span>
                                <input 
                                  type="number"
                                  className="w-full text-xs bg-background border rounded px-2 py-0.5 h-7"
                                  value={item.qty} 
                                  onChange={(e) => {
                                    const updated = [...editingItemsList];
                                    updated[idx].qty = Number(e.target.value);
                                    setEditingItemsList(updated);
                                  }} 
                                />
                              </div>
                              <div className="flex items-center justify-end">
                                <span className="text-xs font-bold text-primary">{formatPrice(item.price * item.qty)}</span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive h-8 w-8 hover:bg-destructive/10 shrink-0"
                            onClick={() => {
                              setEditingItemsList(prev => prev.filter((_, i) => i !== idx));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Quick Add Custom Item */}
                    <div className="border border-dashed p-3 rounded-lg space-y-2 mt-2 bg-muted/10">
                      <p className="text-xs font-bold text-muted-foreground">Tambah Item Baru (Sparepart / Jasa)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          placeholder="Nama Oli / Sparepart / Jasa" 
                          value={newItemName} 
                          onChange={(e) => setNewItemName(e.target.value)}
                          className="text-xs border rounded px-2 py-1 h-8 bg-background"
                        />
                        <input 
                          type="number" 
                          placeholder="Harga (Rp)" 
                          value={newItemPrice} 
                          onChange={(e) => setNewItemPrice(e.target.value)}
                          className="text-xs border rounded px-2 py-1 h-8 bg-background"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Select value={newItemType} onValueChange={setNewItemType}>
                            <SelectTrigger className="h-8 text-xs w-[90px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="product">Produk</SelectItem>
                              <SelectItem value="service">Servis</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Qty</span>
                            <input 
                              type="number" 
                              value={newItemQty} 
                              onChange={(e) => setNewItemQty(Number(e.target.value))}
                              className="text-xs border rounded h-8 w-12 text-center bg-background" 
                            />
                          </div>
                        </div>
                        <Button 
                          type="button" 
                          size="sm" 
                          onClick={() => {
                            if (!newItemName.trim()) {
                              alert('Nama item tidak boleh kosong.');
                              return;
                            }
                            const priceVal = Number(newItemPrice) || 0;
                            setEditingItemsList(prev => [
                              ...prev,
                              {
                                id: Date.now().toString(),
                                name: newItemName,
                                price: priceVal,
                                qty: newItemQty,
                                type: newItemType
                              }
                            ]);
                            setNewItemName('');
                            setNewItemPrice('');
                            setNewItemQty(1);
                          }}
                        >
                          Tambah
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg border text-sm mt-3">
                      <span className="font-bold">Total (Draft)</span>
                      <span className="font-bold text-primary text-base">
                        {formatPrice(editingItemsList.reduce((sum, i) => sum + i.price * i.qty, 0))}
                      </span>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setEditingItemsList(selectedOrder.items || []);
                          setIsEditingItems(false);
                        }}
                      >
                        Batal Edit
                      </Button>
                      <Button 
                        type="button" 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={async () => {
                          const calculatedTotal = editingItemsList.reduce((sum, i) => sum + i.price * i.qty, 0);
                          const { error } = await supabase
                            .from('web_orders')
                            .update({
                              items: editingItemsList,
                              total: calculatedTotal
                            })
                            .eq('id', selectedOrder.id);
                          if (error) {
                            alert('Gagal menyimpan perubahan: ' + error.message);
                          } else {
                            alert('Perubahan item berhasil disimpan!');
                            fetchOrders();
                            setSelectedOrder(prev => ({
                              ...prev,
                              items: editingItemsList,
                              total: calculatedTotal
                            }));
                            setIsEditingItems(false);
                          }
                        }}
                      >
                        Simpan Perubahan
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedOrder.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-xs leading-relaxed">
                    <strong className="block mb-1">Catatan Pelanggan:</strong>
                    {selectedOrder.notes}
                  </div>
                )}

                 {/* Mechanic Assignment & Send Invoice Block for service/mixed orders awaiting inspection */}
{selectedOrder.status === 'pending' && (selectedOrder.order_type === 'service' || selectedOrder.order_type === 'mixed' || (Array.isArray(selectedOrder.items) && selectedOrder.items.some(i => i.type === 'service'))) && (
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg space-y-3 mt-4 text-xs">
                    <p className="font-bold text-orange-950 uppercase flex items-center gap-1">🔧 Proses Estimasi & Kirim Tagihan</p>
                    <p className="text-muted-foreground leading-relaxed">
                      Pilih mekanik yang akan ditugaskan, sesuaikan daftar item & biaya servis di atas (klik <strong>Edit Item & Biaya</strong>), lalu klik tombol di bawah untuk mengirim tagihan ke pelanggan.
                    </p>
                    
                    <div className="space-y-1">
                      <label className="font-semibold block text-orange-950">Mekanik yang Ditugaskan</label>
                      <Select
                        value={selectedMechanics[selectedOrder.id]?.id || ''}
                        onValueChange={(val) => {
                          const mech = mechanics.find((m) => m.id === val);
                          if (mech) {
                            setSelectedMechanics((prev) => ({
                              ...prev,
                              [selectedOrder.id]: mech,
                            }));
                          }
                        }}
                      >
                        <SelectTrigger className="w-full bg-background border border-orange-300">
                          <SelectValue placeholder="Pilih Mekanik" />
                        </SelectTrigger>
                        <SelectContent>
                          {mechanics.map((mech) => (
                            <SelectItem key={mech.id} value={mech.id}>
                              {mech.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-9 mt-1"
                      onClick={async () => {
                        const mech = selectedMechanics[selectedOrder.id];
                        if (!mech) {
                          alert('Silakan pilih mekanik terlebih dahulu sebelum mengirim tagihan.');
                          return;
                        }
                        const calculatedTotal = editingItemsList.reduce((sum, i) => sum + i.price * i.qty, 0);
                        if (calculatedTotal <= 0) {
                          if (!window.confirm('Peringatan: Total tagihan adalah Rp 0. Apakah Anda yakin ingin mengirim tagihan ini?')) {
                            return;
                          }
                        }
                        setAssigning(true);
                         const { error } = await supabase
                           .from('web_orders')
                           .update({
                             items: editingItemsList,
                             total: calculatedTotal,
                             mechanic_id: mech.id,
                             mechanic_name: mech.name
                           })
                           .eq('id', selectedOrder.id);

                        setAssigning(false);
                        if (error) {
                          alert('Gagal mengirim tagihan: ' + error.message);
                        } else {
                          // Buka WhatsApp
                          let phone = selectedOrder.customer_phone || '';
                          phone = phone.replace(/[^0-9]/g, '');
                          if (phone.startsWith('0')) {
                            phone = '62' + phone.slice(1);
                          }
                          
                          if (phone) {
                            const formattedTotal = new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR'
                            }).format(calculatedTotal);
                            
                            const textMessage = `Halo ${selectedOrder.customer_name},\n\nTagihan servis motor Anda (${selectedOrder.customer_motor || '-'}) telah siap.\nTotal: ${formattedTotal}\nMekanik: ${mech.name}\n\nSilakan buka link berikut untuk memeriksa rincian dan melakukan pembayaran:\nhttps://web-bengkel-customer.vercel.app/orders\n\nTerima kasih!`;
                            
                            const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(textMessage)}`;
                            window.open(waUrl, '_blank');
                          } else {
                            alert('Tagihan berhasil dikirim! (Nomor WhatsApp pelanggan tidak ditemukan)');
                          }

                          fetchOrders();
                          setSelectedOrder(null);
                        }
                      }}
                      disabled={assigning}
                    >
                      {assigning ? 'Mengirim...' : 'Kirim Tagihan & Minta Pembayaran'}
                    </Button>
                  </div>
                )}

                {/* Action Buttons in Modal */}
                <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                  <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>
                    Tutup
                  </Button>
                                      
                  {selectedOrder.status === 'pending' && (
                    <>
                      {!selectedOrder.mechanic_id ? (
                        <>
                          {(selectedOrder.order_type === 'product' || !selectedOrder.order_type) && (
                            <>
                              <div className="w-[140px] shrink-0">
                                <Select
                                  value={selectedMechanics[selectedOrder.id]?.id || ''}
                                  onValueChange={(val) => {
                                    const mech = mechanics.find((m) => m.id === val);
                                    if (mech) {
                                      setSelectedMechanics((prev) => ({
                                        ...prev,
                                        [selectedOrder.id]: mech,
                                      }));
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-full h-9">
                                    <SelectValue placeholder="Pilih Mekanik" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {mechanics.map((mech) => (
                                      <SelectItem key={mech.id} value={mech.id}>
                                        {mech.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <Button 
                                variant="default" 
                                size="sm" 
                                className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                                onClick={async () => {
                                  const mech = selectedMechanics[selectedOrder.id];
                                  if (!mech) {
                                    alert('Silakan pilih mekanik terlebih dahulu.');
                                    return;
                                  }
                                  setAssigning(true);
                                  const { error } = await supabase
                                    .from('web_orders')
                                    .update({
                                      status: 'confirmed',
                                      mechanic_id: mech.id,
                                      mechanic_name: mech.name,
                                    })
                                    .eq('id', selectedOrder.id);
                                  if (error) {
                                    alert('Gagal mengkonfirmasi pesanan: ' + error.message);
                                  } else {
                                    fetchOrders();
                                    setSelectedOrder(null);
                                  }
                                  setAssigning(false);
                                }}
                                disabled={assigning}
                              >
                                Konfirmasi Pesanan
                              </Button>
                            </>
                          )}
                        </>
                      ) : null}
                      
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => {
                          handleUpdateStatus(selectedOrder.id, 'cancelled');
                          setSelectedOrder(null);
                        }}
                      >
                        Tolak
                      </Button>
                    </>
                  )}

                  {selectedOrder.status === 'confirmed' && (
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700 text-white gap-1"
                      onClick={() => {
                        handleUpdateStatus(selectedOrder.id, 'done');
                        setSelectedOrder(null);
                      }}
                    >
                      Pesanan Selesai
                    </Button>
                  )}

                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1"
                    onClick={() => handleDeleteOrder(selectedOrder.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}



