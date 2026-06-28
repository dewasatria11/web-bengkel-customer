import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { ArrowLeft, Loader2, CheckCircle, XCircle, Clock, Check, Eye, User, RefreshCw, Trash2 } from 'lucide-react';
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


  const fetchOrders = async () => {
    setLoading(true);
    // Fetch all web orders and mark them as read by admin (if open page or update happens)
    const { data, error } = await supabase
      .from('web_orders')
      .select('*')
      .order('created_at', { ascending: false });

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
    fetchOrders();
    fetchMechanics();
  }, []);


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
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-semibold">Menunggu Konfirmasi</span>;
      case 'confirmed':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-semibold">Dikonfirmasi / Proses</span>;
      case 'done':
        return <span className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full font-semibold">Selesai</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-semibold">Dibatalkan</span>;
      default:
        return <span className="bg-muted text-muted-foreground text-xs px-2.5 py-1 rounded-full font-semibold">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Kelola Pesanan Pelanggan</h1>
              <p className="text-xs text-muted-foreground">{storeName}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            Refresh
          </Button>
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
                        <p className="text-primary font-bold text-lg">{formatPrice(order.total)}</p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t pt-4">
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
<div className="flex gap-2">
  <Button variant="outline" size="sm" className="gap-1" onClick={() => handleMarkAsRead(order)}>
    <Eye className="h-3.5 w-3.5" /> Detail
  </Button>
                      
  {order.status === 'pending' && (
    <div className="flex items-center gap-2">
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
        <SelectTrigger className="w-[140px] h-9">
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
    </div>
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
                    <span className="font-semibold text-right">{getStatusBadge(selectedOrder.status)}</span>
                    {selectedOrder.mechanic_name && (
                      <>
                        <span className="text-muted-foreground">Mekanik Terpilih</span>
                        <span className="font-bold text-right text-primary">{selectedOrder.mechanic_name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Items Section */}
                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">Item Dipesan</h4>
                  <div className="border rounded-lg overflow-hidden divide-y">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="p-3 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-foreground">{item.name}</p>
                          <p className="text-muted-foreground">
                            {formatPrice(item.price)} x {item.qty}
                          </p>
                        </div>
                        <span className="font-bold text-foreground">
                          {formatPrice(item.price * item.qty)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg border">
                    <span className="font-bold text-sm">Total Bayar</span>
                    <span className="font-bold text-primary text-base">
                      {formatPrice(selectedOrder.total)}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-xs leading-relaxed">
                    <strong className="block mb-1">Catatan Pelanggan:</strong>
                    {selectedOrder.notes}
                  </div>
                )}

                {/* Action Buttons in Modal */}
<div className="flex justify-end gap-2 border-t pt-4">
  <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>
    Tutup
  </Button>
                      
  {selectedOrder.status === 'pending' && (
    <div className="flex items-center gap-2">
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
        <SelectTrigger className="w-[140px] h-9">
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
      <Button 
        variant="destructive" 
        size="sm" 
        onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
      >
        Tolak
      </Button>
    </div>
  )}

  {selectedOrder.status === 'confirmed' && (
    <Button 
      variant="default" 
      size="sm" 
      className="bg-green-600 hover:bg-green-700 text-white gap-1"
      onClick={() => handleUpdateStatus(selectedOrder.id, 'done')}
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



