import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { 
  ArrowLeft, 
  RefreshCcw, 
  Trash2, 
  Radio, 
  Key,
  Save,
  PlayCircle,
  PowerOff,
  Power,
  Link as LinkIcon,
  Activity,
  List
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';

const BASE_URL = "https://server.soundboxqris123.workers.dev";

export default function AdminMonitoring() {
  const navigate = useNavigate();
  const { showToast, showConfirm } = useNotifications();

  const [adminKey, setAdminKey] = useState('');
  const [adminKeyInput, setAdminKeyInput] = useState('');
  
  // Store Form
  const [storeId, setStoreId] = useState('');
  const [storeName, setStoreName] = useState('');

  // Data
  const [stores, setStores] = useState([]);
  const [devices, setDevices] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Tx Filters
  const [txStore, setTxStore] = useState('');
  const [txPlayed, setTxPlayed] = useState('0'); // '0' pending, '1' played, '' all
  const [txLimit, setTxLimit] = useState('50');

  // Logs
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  // Loadings
  const [loading, setLoading] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [loadingTx, setLoadingTx] = useState(false);

  // Pair Modal
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairStoreId, setPairStoreId] = useState('');
  const [pairStoreName, setPairStoreName] = useState('');
  const [pairDeviceId, setPairDeviceId] = useState('');
  const [pairStatus, setPairStatus] = useState('');
  const [pairing, setPairing] = useState(false);

  const addLog = (msg) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 100));
  };

  useEffect(() => {
    const savedKey = sessionStorage.getItem("SOUNDBOX_ADMIN_KEY");
    if (savedKey) {
      setAdminKey(savedKey);
      setAdminKeyInput(savedKey);
    }
  }, []);

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey]);

  const handleSaveKey = () => {
    const k = adminKeyInput.trim();
    if (!k) {
      showToast('Masukkan ADMIN_KEY dulu', 'error');
      return;
    }
    sessionStorage.setItem("SOUNDBOX_ADMIN_KEY", k);
    setAdminKey(k);
    addLog("ADMIN_KEY tersimpan di sessionStorage");
    showToast('ADMIN_KEY tersimpan', 'success');
  };

  const handleClearKey = () => {
    sessionStorage.removeItem("SOUNDBOX_ADMIN_KEY");
    setAdminKey('');
    setAdminKeyInput('');
    addLog("ADMIN_KEY dihapus dari sessionStorage");
    showToast('ADMIN_KEY dihapus (kembali ke Mode Monitoring)', 'info');
  };

  const adminFetch = async (path, opts = {}) => {
    const isGet = !opts.method || opts.method.toUpperCase() === 'GET';
    if (!adminKey && !isGet) {
      throw new Error("Akses ditolak: ADMIN_KEY diperlukan untuk melakukan aksi ini.");
    }
    const headers = {};
    if (adminKey) {
      headers["x-admin-key"] = adminKey;
    }
    if (opts.headers) {
      Object.assign(headers, opts.headers);
    }
    const res = await fetch(BASE_URL + path, { ...opts, headers });
    const txt = await res.text();
    let data;
    try { data = JSON.parse(txt); } catch { data = txt; }
    
    if (res.status === 401) {
      if (adminKey) {
        handleClearKey();
      }
      throw new Error("Unauthorized (401). Key admin salah atau diperlukan.");
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
    return data;
  };

  const refreshAll = async () => {
    await fetchStores();
    await fetchDevices();
    await fetchTransactions();
  };

  const fetchStores = async () => {
    try {
      setLoading(true);
      addLog("GET /admin/stores ...");
      const data = await adminFetch("/admin/stores");
      setStores(data.stores || []);
      addLog(`OK: loaded ${data.stores?.length || 0} stores`);
    } catch (e) {
      addLog(`ERR: ${e.message}`);
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      setLoadingDevices(true);
      addLog("GET /admin/devices ...");
      const data = await adminFetch("/admin/devices");
      setDevices(data.devices || []);
      addLog(`OK: loaded ${data.devices?.length || 0} devices`);
    } catch (e) {
      addLog(`ERR: ${e.message}`);
    } finally {
      setLoadingDevices(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoadingTx(true);
      const params = new URLSearchParams();
      if (txStore) params.set("store_id", txStore);
      if (txPlayed === "0" || txPlayed === "1") params.set("played", txPlayed);
      if (txLimit) params.set("limit", txLimit);

      const query = params.toString();
      const path = query ? `/admin/transactions?${query}` : "/admin/transactions";
      addLog(`GET ${path} ...`);
      const data = await adminFetch(path);
      setTransactions(data.transactions || []);
      addLog(`OK: loaded ${data.transactions?.length || 0} transactions`);
    } catch (e) {
      addLog(`ERR: ${e.message}`);
    } finally {
      setLoadingTx(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txStore, txPlayed, txLimit]);

  const handleUpsertStore = async (e) => {
    e.preventDefault();
    if (!storeId || !storeName) {
      showToast('store_id dan name wajib diisi', 'error');
      return;
    }
    try {
      addLog("POST /admin/stores (upsert) ...");
      const out = await adminFetch("/admin/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId, name: storeName }),
      });
      addLog(`OK: upsert ${storeId} | token=${out.device_token}`);
      await fetchStores();
      
      // Gunakan showConfirm sebagai pengganti alert panjang
      await showConfirm("Store Berhasil Disimpan", `store_id: ${out.store_id}\nname: ${out.name}\ndevice_token: ${out.device_token}\n\nSimpan token ini untuk soundbox.`);
      
      setStoreId('');
      setStoreName('');
    } catch (e) {
      addLog(`ERR: ${e.message}`);
      showToast(e.message, 'error');
    }
  };

  const toggleStoreState = async (id, isEnable) => {
    try {
      const endpoint = isEnable ? "/admin/stores/enable" : "/admin/stores/disable";
      addLog(`POST ${endpoint} ${id} ...`);
      await adminFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: id })
      });
      showToast(`${id} ${isEnable ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      await fetchStores();
    } catch (e) {
      addLog(`ERR: ${e.message}`);
      showToast(e.message, 'error');
    }
  };

  const deleteStore = async (id) => {
    const confirmed = await showConfirm('Hapus Store', `Yakin hapus store ${id} permanen?`);
    if (!confirmed) return;
    try {
      addLog(`POST /admin/stores/delete ${id} ...`);
      await adminFetch("/admin/stores/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: id })
      });
      showToast(`${id} dihapus`, 'info');
      await fetchStores();
    } catch (e) {
      addLog(`ERR: ${e.message}`);
      showToast(e.message, 'error');
    }
  };

  const testSound = async (id, name) => {
    const confirmed = await showConfirm('Tes Suara', `Kirim tes suara (Rp 1) ke ${name || id}?`);
    if (!confirmed) return;
    try {
      addLog(`POST /admin/stores/test ${id}...`);
      const data = await adminFetch("/admin/stores/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: id }),
      });
      showToast("Tes suara dikirim!", "success");
      addLog(`Test sound for ${id}: TX ID ${data.transaction_id}`);
      await fetchTransactions();
    } catch (e) {
      addLog(`ERR: ${e.message}`);
      showToast(e.message, 'error');
    }
  };

  const openPairModal = (id, name) => {
    setPairStoreId(id);
    setPairStoreName(name || id);
    setPairDeviceId('');
    setPairStatus('');
    setShowPairModal(true);
  };

  const submitPair = async () => {
    const devId = pairDeviceId.trim().toUpperCase();
    if (!devId) {
      setPairStatus("⚠️ Device ID tidak boleh kosong!");
      return;
    }
    if (!devId.startsWith("SOUNDBOX-")) {
      const ok = await showConfirm("Format Device ID", `Device ID "${devId}" tidak dimulai dengan SOUNDBOX-. Lanjut?`);
      if (!ok) return;
    }
    setPairStatus("⏳ Mengirim permintaan pair...");
    setPairing(true);
    try {
      const data = await adminFetch("/admin/stores/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: pairStoreId, device_id: devId }),
      });
      setPairStatus(`✅ ${data.message || "Pending pair created!"}`);
      addLog(`Pair request: ${devId} → ${pairStoreId}`);
      showToast(`Pair request sent for ${devId}`, "success");
      setTimeout(() => setShowPairModal(false), 2000);
    } catch (e) {
      setPairStatus(`❌ ${e.message}`);
      addLog(`Pair error: ${e.message}`);
    } finally {
      setPairing(false);
    }
  };

  const clearPendingTx = async () => {
    if (!txStore) {
      showToast("Pilih filter 'Store' terlebih dahulu untuk menghapus transaksi.", 'error');
      return;
    }
    const confirmed = await showConfirm("Hapus Transaksi", `Hapus semua transaksi untuk ${txStore}?`);
    if (!confirmed) return;
    try {
      addLog(`POST /admin/transactions/clear ${txStore} ...`);
      const out = await adminFetch("/admin/transactions/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: txStore })
      });
      showToast(`Terhapus ${out.deleted || 0} transaksi`, 'success');
      await fetchTransactions();
    } catch (e) {
      addLog(`ERR: ${e.message}`);
      showToast(e.message, 'error');
    }
  };

  // Helpers
  const parseD1Date = (val) => {
    if (!val) return null;
    const str = String(val);
    return str.includes("T") ? new Date(str) : new Date(str.replace(" ", "T") + "Z");
  };

  const formatMinsAgo = (mins) => {
    if (!Number.isFinite(mins) || mins === null) return "-";
    if (mins < 0) return "baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    const m = mins % 60;
    if (hours < 24) return m === 0 ? `${hours} jam lalu` : `${hours} jam ${m} menit lalu`;
    const days = Math.floor(hours / 24);
    const rem = hours % 24;
    return `${days} hari ${rem > 0 ? rem + ' jam' : ''} lalu`;
  };

  const formatWibDate = (val) => {
    const d = parseD1Date(val);
    if (!d || isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false, timeZone: "Asia/Jakarta"
    }).format(d);
  };

  const formatRupiah = (amount) => {
    const num = Number(amount);
    if (!Number.isFinite(num)) return "-";
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <div className="bg-background border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Radio className="h-5 w-5 text-primary" /> Monitoring Soundbox
              </h1>
              <p className="text-xs text-muted-foreground">{BASE_URL}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        
        {!adminKey && (
          <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div>
              <span className="font-bold">📢 Mode Monitoring (Read-Only):</span> Anda dapat memantau status alat secara real-time. Masukkan ADMIN_KEY di bawah untuk mengaktifkan fitur manajemen (tambah/edit/hapus/tes).
            </div>
          </div>
        )}

        {/* TOP CARDS: Login & Upsert Store */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-background shadow-sm h-fit">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" /> Akses API (Admin Key)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ADMIN_KEY</Label>
                <div className="flex gap-2">
                  <Input 
                    type="password" 
                    placeholder="Masukkan ADMIN_KEY Cloudflare" 
                    value={adminKeyInput}
                    onChange={e => setAdminKeyInput(e.target.value)}
                  />
                  <Button onClick={handleSaveKey}>Simpan</Button>
                </div>
              </div>
              {adminKey ? (
                <div className="flex items-center justify-between text-sm p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg">
                  <span>✅ Terkoneksi (Mode Manajemen Aktif)</span>
                  <Button variant="ghost" size="sm" onClick={handleClearKey} className="h-7 px-2 text-green-800 hover:bg-green-200">
                    Hapus Key
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground p-3 bg-slate-50 border rounded-lg">
                  ℹ️ Simpan key untuk mengaktifkan fitur tulis/modifikasi. Mode saat ini: <strong>Read-Only</strong>.
                </div>
              )}
            </CardContent>
          </Card>

          {adminKey && (
            <Card className="bg-background shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Save className="h-5 w-5 text-primary" /> Tambah / Update Store
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpsertStore} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ID Store (Unik)</Label>
                      <Input value={storeId} onChange={e => setStoreId(e.target.value)} placeholder="Misal: TOKO_01" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Nama Store</Label>
                      <Input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Nama Cabang" required />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">Simpan Store</Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {true && (
          <>
            {/* DEVICES MONITOR */}
            <Card className="bg-background shadow-sm overflow-hidden">
              <CardHeader className="border-b bg-muted/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" /> Status Devices
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={fetchDevices} disabled={loadingDevices} className="gap-2">
                    <RefreshCcw className={`h-4 w-4 ${loadingDevices ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                    <tr>
                      <th className="px-6 py-3">Store</th>
                      <th className="px-6 py-3">Firmware / IP</th>
                      <th className="px-6 py-3">Last Seen</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {devices.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-muted-foreground">Belum ada data device heartbeat.</td>
                      </tr>
                    ) : (
                      devices.map(d => {
                        const lsDate = parseD1Date(d.last_seen);
                        const mins = lsDate ? Math.floor((Date.now() - lsDate.getTime()) / 60000) : NaN;
                        
                        let badge = <span className="inline-flex px-2 py-1 text-[10px] rounded-full bg-gray-100 text-gray-700">No Setup</span>;
                        if (!Number.isNaN(mins)) {
                          if (mins < 5) badge = <span className="inline-flex px-2 py-1 text-[10px] font-bold rounded-full bg-green-100 text-green-700">Online</span>;
                          else if (mins > 30) badge = <span className="inline-flex px-2 py-1 text-[10px] font-bold rounded-full bg-red-100 text-red-700">Offline</span>;
                          else badge = <span className="inline-flex px-2 py-1 text-[10px] font-bold rounded-full bg-yellow-100 text-yellow-700">Idle ({mins}m)</span>;
                        }

                        return (
                          <tr key={d.store_id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-foreground">{d.name || "(No Name)"}</div>
                              <div className="text-xs text-muted-foreground font-mono mt-0.5">{d.store_id}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs">Ver: {d.firmware_version || "-"}</div>
                              <div className="text-xs text-muted-foreground">IP: {d.ip_address || "-"}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div>{formatMinsAgo(mins)}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{formatWibDate(d.last_seen)}</div>
                            </td>
                            <td className="px-6 py-4">{badge}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* STORES MANAGEMENT */}
            <Card className="bg-background shadow-sm overflow-hidden">
              <CardHeader className="border-b bg-muted/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <List className="h-5 w-5 text-primary" /> Manajemen Store
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={fetchStores} disabled={loading} className="gap-2">
                    <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                    <tr>
                      <th className="px-6 py-3">Store ID</th>
                      <th className="px-6 py-3">Nama</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 min-w-[200px]">Device Token</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stores.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-muted-foreground">Tidak ada data store.</td>
                      </tr>
                    ) : (
                      stores.map(s => (
                        <tr key={s.store_id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold font-mono">{s.store_id}</div>
                            <div className="text-[10px] text-muted-foreground">{formatWibDate(s.created_at)}</div>
                          </td>
                          <td className="px-6 py-4 font-medium">{s.name}</td>
                          <td className="px-6 py-4">
                            {s.enabled 
                              ? <span className="inline-flex px-2 py-1 text-[10px] font-bold rounded-full bg-green-100 text-green-700 border border-green-200">Enabled</span>
                              : <span className="inline-flex px-2 py-1 text-[10px] font-bold rounded-full bg-red-100 text-red-700 border border-red-200">Disabled</span>
                            }
                          </td>
                          <td className="px-6 py-4">
                            <div className="bg-muted p-2 rounded text-[10px] font-mono break-all text-muted-foreground border">
                              {s.device_token || "-"}
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => openPairModal(s.store_id, s.name)}>
                                <LinkIcon className="h-3 w-3 mr-1" /> Pair
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => testSound(s.store_id, s.name)}>
                                <PlayCircle className="h-3 w-3 mr-1" /> Tes
                              </Button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={() => {
                                setStoreId(s.store_id);
                                setStoreName(s.name);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}>Edit</Button>
                              
                              {s.enabled ? (
                                <Button variant="outline" size="sm" className="h-7 text-xs text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => toggleStoreState(s.store_id, false)}>
                                  <PowerOff className="h-3 w-3 mr-1" /> Disable
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm" className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50" onClick={() => toggleStoreState(s.store_id, true)}>
                                  <Power className="h-3 w-3 mr-1" /> Enable
                                </Button>
                              )}
                              
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => deleteStore(s.store_id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* TRANSACTIONS */}
            <Card className="bg-background shadow-sm overflow-hidden">
              <CardHeader className="border-b bg-muted/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <List className="h-5 w-5 text-primary" /> Transaksi Audio
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 items-center">
                    <select 
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      value={txStore}
                      onChange={e => setTxStore(e.target.value)}
                    >
                      <option value="">Semua Store</option>
                      {stores.map(s => <option key={s.store_id} value={s.store_id}>{s.name} ({s.store_id})</option>)}
                    </select>
                    
                    <select 
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      value={txPlayed}
                      onChange={e => setTxPlayed(e.target.value)}
                    >
                      <option value="">Semua Status</option>
                      <option value="0">Pending (Belum Bunyi)</option>
                      <option value="1">Played (Sudah Bunyi)</option>
                    </select>

                    <select 
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      value={txLimit}
                      onChange={e => setTxLimit(e.target.value)}
                    >
                      <option value="20">20 Data</option>
                      <option value="50">50 Data</option>
                      <option value="100">100 Data</option>
                    </select>

                    <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={loadingTx}>
                      <RefreshCcw className={`h-4 w-4 mr-2 ${loadingTx ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>

                    <Button variant="destructive" size="sm" onClick={clearPendingTx} title="Hapus transaksi (Pilih store dulu)">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/30 sticky top-0">
                    <tr>
                      <th className="px-6 py-3">ID</th>
                      <th className="px-6 py-3">Store</th>
                      <th className="px-6 py-3">Nominal</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Created</th>
                      <th className="px-6 py-3">Delay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-muted-foreground">Tidak ada transaksi ditemukan.</td>
                      </tr>
                    ) : (
                      transactions.map(t => {
                        const isPlayed = Number(t.played) === 1;
                        const dateCreated = parseD1Date(t.created_at);
                        const datePlayed = parseD1Date(t.played_at);
                        let delayStr = "-";
                        if (dateCreated && datePlayed) {
                          const diff = Math.round((datePlayed - dateCreated) / 1000);
                          delayStr = diff < 0 ? "0 detik" : `${diff} detik`;
                        }

                        return (
                          <tr key={t.id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs">{t.id}</td>
                            <td className="px-6 py-4 font-medium">{t.store_id}</td>
                            <td className="px-6 py-4 font-bold text-green-700">{formatRupiah(t.amount)}</td>
                            <td className="px-6 py-4">
                              {isPlayed 
                                ? <span className="inline-flex px-2 py-1 text-[10px] font-bold rounded-full bg-green-100 text-green-700">Played</span>
                                : <span className="inline-flex px-2 py-1 text-[10px] font-bold rounded-full bg-yellow-100 text-yellow-700">Pending</span>
                              }
                            </td>
                            <td className="px-6 py-4 text-xs text-muted-foreground">{formatWibDate(t.created_at)}</td>
                            <td className="px-6 py-4 text-xs">{delayStr}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* LOGS */}
            <Card className="bg-background shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" /> Activity Log
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="bg-slate-900 text-slate-300 font-mono text-xs p-4 h-64 overflow-y-auto rounded-b-lg flex flex-col-reverse">
                  <div ref={logEndRef} />
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1 whitespace-pre-wrap">{log}</div>
                  ))}
                  {logs.length === 0 && <div className="text-slate-500 italic">Belum ada log aktivitas...</div>}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* PAIRING MODAL */}
      <Dialog open={showPairModal} onOpenChange={setShowPairModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" /> Pair Device
            </DialogTitle>
            <div className="text-sm text-muted-foreground mt-2">
              Hubungkan soundbox ke store <strong className="text-foreground">{pairStoreName}</strong>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Device ID</Label>
              <Input 
                value={pairDeviceId} 
                onChange={e => setPairDeviceId(e.target.value.toUpperCase())}
                placeholder="Misal: SOUNDBOX-A1B2"
                className="font-mono text-lg uppercase tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                Device ID dapat dilihat pada layar LCD soundbox atau di portal WiFi (http://192.168.4.1).
              </p>
            </div>
            {pairStatus && (
              <div className="text-sm p-3 bg-muted rounded-md border font-medium">
                {pairStatus}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPairModal(false)}>Batal</Button>
            <Button onClick={submitPair} disabled={pairing}>
              {pairing ? "Loading..." : "Pair Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}