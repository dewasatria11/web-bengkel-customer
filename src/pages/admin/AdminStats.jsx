import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { supabase } from '../../supabaseClient';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { ArrowLeft, Loader2, TrendingUp, Calendar, PackageOpen, Wrench, Car, Download, X } from 'lucide-react';
import { formatPrice } from '../../lib/formatters';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useStore } from '../../context/StoreContext';

export default function AdminStats() {
  const navigate = useNavigate();
  const { showToast } = useNotifications();
  const [loading, setLoading] = useState(true);
  const { storeName } = useStore();

  // Stats Data
  const [totalVehicles, setTotalVehicles] = useState(0);
  
  // Revenue
  const [revenueToday, setRevenueToday] = useState(0);
  const [revenueThisMonth, setRevenueThisMonth] = useState(0);
  const [revenueThisYear, setRevenueThisYear] = useState(0);
  const [revenueFiltered, setRevenueFiltered] = useState(0);

  // Top Items
  const [topProducts, setTopProducts] = useState([]);
  const [topServices, setTopServices] = useState([]);

  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        let query = supabase
          .from('web_orders')
          .select('items, total, created_at, status')
          .eq('status', 'done');

        if (startDate) {
          query = query.gte('created_at', `${startDate}T00:00:00.000`);
        }
        if (endDate) {
          query = query.lte('created_at', `${endDate}T23:59:59.999`);
        }

        const { data: orders, error } = await query;

        if (error) throw error;

        // --- Perhitungan Kendaraan Diservis ---
        // Asumsi: setiap pesanan (done) mewakili 1 kendaraan yang diservis
        setTotalVehicles(orders.length);

        // --- Perhitungan Pendapatan ---
        const now = new Date();
        const todayStr = now.toLocaleDateString('id-ID'); // MM/DD/YYYY format local, kita bandingkan YYYY-MM-DD lebih aman
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentDate = now.getDate();

        let revToday = 0;
        let revMonth = 0;
        let revYear = 0;
        let revFiltered = 0;

        const productSales = {};
        const serviceSales = {};

        orders.forEach(order => {
          const orderDate = new Date(order.created_at);
          const total = order.total || 0;

          // Cek tahun
          // Base revenue calculation (we only want to compute this for unfiltered data ideally, 
          // but since we are fetching filtered data, these will just reflect the filtered subset, 
          // which is fine, but let's compute an explicit filtered revenue sum)
          revFiltered += total;

          if (orderDate.getFullYear() === currentYear) {
            revYear += total;
            // Cek bulan
            if (orderDate.getMonth() === currentMonth) {
              revMonth += total;
              // Cek hari
              if (orderDate.getDate() === currentDate) {
                revToday += total;
              }
            }
          }

          // Agregasi item terlaris
          const items = order.items || [];
          items.forEach(item => {
            const name = item.name;
            const qty = item.qty || 1;
            
            if (item.type === 'product') {
              if (!productSales[name]) productSales[name] = 0;
              productSales[name] += qty;
            } else if (item.type === 'service') {
              if (!serviceSales[name]) serviceSales[name] = 0;
              serviceSales[name] += qty;
            }
          });
        });

        setRevenueToday(revToday);
        setRevenueThisMonth(revMonth);
        setRevenueThisYear(revYear);
        setRevenueFiltered(revFiltered);

        // Sort Top Products & Services
        const sortedProducts = Object.entries(productSales)
          .map(([name, qty]) => ({ name, qty }))
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5); // Ambil 5 terlaris

        const sortedServices = Object.entries(serviceSales)
          .map(([name, qty]) => ({ name, qty }))
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5); // Ambil 5 terlaris

        setTopProducts(sortedProducts);
        setTopServices(sortedServices);

      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    }

  }, []);

  useEffect(() => {
    async function fetchStatsWrapper() {
      setLoading(true);
      try {
        let query = supabase
          .from('web_orders')
          .select('items, total, created_at, status')
          .eq('status', 'done');

        if (startDate) {
          query = query.gte('created_at', `${startDate}T00:00:00.000`);
        }
        if (endDate) {
          query = query.lte('created_at', `${endDate}T23:59:59.999`);
        }

        const { data: orders, error } = await query;
        if (error) throw error;

        setTotalVehicles(orders.length);

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentDate = now.getDate();

        let revToday = 0;
        let revMonth = 0;
        let revYear = 0;
        let revFiltered = 0;

        const productSales = {};
        const serviceSales = {};

        orders.forEach(order => {
          const orderDate = new Date(order.created_at);
          const total = order.total || 0;
          revFiltered += total;

          if (orderDate.getFullYear() === currentYear) {
            revYear += total;
            if (orderDate.getMonth() === currentMonth) {
              revMonth += total;
              if (orderDate.getDate() === currentDate) {
                revToday += total;
              }
            }
          }

          const items = order.items || [];
          items.forEach(item => {
            const name = item.name;
            const qty = item.qty || 1;
            
            if (item.type === 'product') {
              if (!productSales[name]) productSales[name] = 0;
              productSales[name] += qty;
            } else if (item.type === 'service') {
              if (!serviceSales[name]) serviceSales[name] = 0;
              serviceSales[name] += qty;
            }
          });
        });

        setRevenueToday(revToday);
        setRevenueThisMonth(revMonth);
        setRevenueThisYear(revYear);
        setRevenueFiltered(revFiltered);

        const sortedProducts = Object.entries(productSales)
          .map(([name, qty]) => ({ name, qty }))
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5);

        const sortedServices = Object.entries(serviceSales)
          .map(([name, qty]) => ({ name, qty }))
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5);

        setTopProducts(sortedProducts);
        setTopServices(sortedServices);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStatsWrapper();
  }, [startDate, endDate]);


  const handleDownloadPDF = () => {
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text(`Laporan Statistik - ${storeName}`, 14, 22);
      
      // Subtitle (Date Range)
      doc.setFontSize(11);
      let dateText = 'Periode: Semua Waktu';
      if (startDate && endDate) {
        dateText = `Periode: ${startDate} s/d ${endDate}`;
      } else if (startDate) {
        dateText = `Periode: Mulai ${startDate}`;
      } else if (endDate) {
        dateText = `Periode: Hingga ${endDate}`;
      }
      doc.setTextColor(100);
      doc.text(dateText, 14, 30);
      
      doc.setTextColor(0);

      // Summary Box
      doc.setFontSize(12);
      doc.text('Ringkasan', 14, 45);
      
      doc.autoTable({
        startY: 50,
        head: [['Keterangan', 'Nilai']],
        body: [
          ['Total Kendaraan Diservis', `${totalVehicles} unit`],
          ['Total Pendapatan (Periode)', formatPrice(revenueFiltered)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }
      });

      // Top Products
      doc.text('5 Produk Terlaris', 14, doc.lastAutoTable.finalY + 15);
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['No', 'Nama Produk', 'Jumlah Terjual']],
        body: topProducts.length > 0 ? topProducts.map((p, i) => [i + 1, p.name, p.qty]) : [['-', 'Tidak ada data', '-']],
        theme: 'striped',
      });

      // Top Services
      doc.text('5 Jasa Servis Terlaris', 14, doc.lastAutoTable.finalY + 15);
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['No', 'Nama Jasa', 'Jumlah Dipesan']],
        body: topServices.length > 0 ? topServices.map((s, i) => [i + 1, s.name, s.qty]) : [['-', 'Tidak ada data', '-']],
        theme: 'striped',
      });

      // Save
      const filename = `Laporan_Statistik_${new Date().getTime()}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Gagal membuat PDF.', 'error');
    } finally {
      setGeneratingPDF(false);
    }
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
              <h1 className="text-xl font-bold tracking-tight text-foreground">Statistik Laporan</h1>
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
            <Button 
              variant="default" 
              size="sm" 
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleDownloadPDF}
              disabled={generatingPDF}
            >
              {generatingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {generatingPDF ? 'Membuat PDF...' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Ringkasan Pendapatan */}
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Ringkasan Pendapatan
              </h2>
              
              {(startDate || endDate) && (
                <div className="mb-4">
                  <Card className="bg-primary/5 border-l-4 border-l-primary">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Pendapatan (Periode Terpilih)</p>
                        <h3 className="text-2xl font-bold text-primary">{formatPrice(revenueFiltered)}</h3>
                      </div>
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-background border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Pendapatan Hari Ini</p>
                        <h3 className="text-2xl font-bold text-foreground">{formatPrice(revenueToday)}</h3>
                      </div>
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <Calendar className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-background border-l-4 border-l-green-500">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Pendapatan Bulan Ini</p>
                        <h3 className="text-2xl font-bold text-foreground">{formatPrice(revenueThisMonth)}</h3>
                      </div>
                      <div className="p-2 bg-green-100 rounded-lg text-green-600">
                        <Calendar className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-background border-l-4 border-l-purple-500">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Pendapatan Tahun Ini</p>
                        <h3 className="text-2xl font-bold text-foreground">{formatPrice(revenueThisYear)}</h3>
                      </div>
                      <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <Calendar className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Statistik Layanan */}
            <div>
              <h2 className="text-lg font-bold mb-4 mt-8 flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                Statistik Operasional
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-background">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Total Kendaraan Diservis</p>
                        <h3 className="text-3xl font-bold text-foreground">{totalVehicles} <span className="text-sm font-normal text-muted-foreground">unit</span></h3>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-full text-primary">
                        <Car className="h-8 w-8" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      *Berdasarkan jumlah pesanan dengan status "Selesai".
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Item Terlaris */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {/* Produk Terlaris */}
              <Card className="bg-background">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PackageOpen className="h-5 w-5 text-blue-500" />
                    Produk Terlaris
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">Belum ada data penjualan produk.</p>
                  ) : (
                    <div className="space-y-4">
                      {topProducts.map((prod, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                          <div className="flex items-center gap-3">
                            <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </div>
                            <span className="font-medium text-sm">{prod.name}</span>
                          </div>
                          <span className="text-sm font-bold bg-muted px-2 py-1 rounded">{prod.qty} terjual</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Jasa Servis Terlaris */}
              <Card className="bg-background">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-green-500" />
                    Jasa Servis Terlaris
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topServices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">Belum ada data pemesanan servis.</p>
                  ) : (
                    <div className="space-y-4">
                      {topServices.map((svc, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                          <div className="flex items-center gap-3">
                            <div className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </div>
                            <span className="font-medium text-sm">{svc.name}</span>
                          </div>
                          <span className="text-sm font-bold bg-muted px-2 py-1 rounded">{svc.qty} kali</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}