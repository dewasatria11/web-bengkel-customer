import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { ArrowLeft, Loader2, MessageCircle, Search, Filter, Calendar } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useNotifications } from '../../context/NotificationContext';

export default function AdminReminder() {
  const navigate = useNavigate();
  const { showToast } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [storeName, setStoreName] = useState('Bengkel');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, over_3_months

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get Store Name
      const { data: storeData } = await supabase
        .from('store_profile')
        .select('name')
        .eq('id', 1)
        .maybeSingle();
      if (storeData?.name) {
        setStoreName(storeData.name);
      }

      // Fetch customers
      const { data: custData, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (custErr) throw custErr;

      // Fetch all done service/mixed orders to find last service date
      const { data: ordersData, error: ordErr } = await supabase
        .from('web_orders')
        .select('customer_id, created_at')
        .in('status', ['done', 'confirmed', 'pending', 'pending_inspection', 'pending_payment']) // We consider any order as activity, but especially done. Actually let's just fetch all orders to see latest activity.
        .order('created_at', { ascending: false });

      if (ordErr) throw ordErr;

      // Map last order date to each customer
      const customerMap = (custData || []).map(cust => {
        const custOrders = (ordersData || []).filter(o => o.customer_id === cust.id);
        const lastOrder = custOrders.length > 0 ? custOrders[0].created_at : cust.created_at; // Fallback to registration date
        
        const lastDate = new Date(lastOrder);
        const now = new Date();
        const diffTime = Math.abs(now - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffMonths = diffDays / 30;

        return {
          ...cust,
          lastActivityDate: lastDate,
          daysSinceLastActivity: diffDays,
          monthsSinceLastActivity: diffMonths,
          isOver3Months: diffMonths >= 3
        };
      });

      setCustomers(customerMap);
    } catch (err) {
      console.error('Error fetching reminder data:', err);
      showToast('Gagal memuat data pelanggan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendWA = (cust) => {
    let phone = cust.no_telepon || '';
    phone = phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1);
    }

    if (!phone) {
      showToast('Nomor telepon tidak valid.', 'error');
      return;
    }

    const typeLabel = cust.jenis_motor === 'matic' ? 'Matic' : cust.jenis_motor === 'gigi' ? 'Gigi' : 'Kopling';
    
    let textMessage = `Halo kak ${cust.nama} 👋\n\nKami dari ${storeName} ingin mengingatkan jadwal perawatan motor kakak.\n\n`;
    
    if (cust.isOver3Months) {
      textMessage += `Berdasarkan catatan kami, motor kakak (*${cust.merk_motor} - ${cust.plat_nomor}*) sudah **lebih dari 3 bulan belum diservis** di bengkel kami.\n\nJangan tunda servis motor kakak! Oli yang sudah terlalu lama tidak diganti dan komponen yang tidak dicek bisa membuat performa motor menurun, boros bensin, dan berisiko rusak parah di jalan raya. 🔧\n\nSegera kunjungi kami untuk pengecekan dan dapatkan pelayanan terbaik agar motor kakak kembali prima!\n\nTerima kasih dan sampai jumpa di bengkel! 😊`;
    } else {
      textMessage += `Jangan lupa untuk selalu rutin mengecek kondisi oli dan mesin motor kakak (*${cust.merk_motor} - ${cust.plat_nomor}*) ya!\n\nMotor yang terawat lebih irit bahan bakar, lebih aman, dan lebih awet. 🔧\n\nSegera kunjungi kami dan dapatkan pelayanan terbaik!\n\nTerima kasih dan sampai jumpa di bengkel! 😊`;
    }

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(textMessage)}`;
    window.open(waUrl, '_blank');
  };

  const filteredCustomers = customers.filter(c => {
    const matchSearch = c.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        c.no_telepon.includes(searchTerm) || 
                        c.plat_nomor.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'over_3_months') return matchSearch && c.isOver3Months;
    return matchSearch;
  });

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <div className="bg-background border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Reminder Pelanggan</h1>
              <p className="text-xs text-muted-foreground">Kirim pengingat servis via WhatsApp</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-4">
        {/* Filter / Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, no HP, plat nomor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Semua Pelanggan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Pelanggan</SelectItem>
              <SelectItem value="over_3_months">> 3 Bulan Belum Servis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12 bg-background border rounded-lg">
            <p className="text-muted-foreground">Tidak ada pelanggan yang ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map((cust) => (
              <Card key={cust.id} className={`bg-background shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${cust.isOver3Months ? 'border-orange-300' : ''}`}>
                <CardContent className="p-5 flex flex-col h-full justify-between gap-4">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg leading-tight truncate">{cust.nama}</h3>
                      {cust.isOver3Months && (
                        <span className="bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 border border-orange-200">
                          > 3 Bulan
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-mono mb-1">{cust.no_telepon}</p>
                    <p className="text-xs text-foreground font-semibold">
                      {cust.merk_motor} · {cust.plat_nomor}
                    </p>
                    <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Terakhir aktif: {cust.lastActivityDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>

                  <Button 
                    className={`w-full gap-2 ${cust.isOver3Months ? 'bg-green-600 hover:bg-green-700' : 'bg-primary'}`} 
                    onClick={() => handleSendWA(cust)}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Kirim WA Reminder
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}