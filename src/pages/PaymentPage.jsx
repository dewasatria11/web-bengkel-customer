import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import Navbar from '../components/Navbar'

const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const JENIS_LABEL = { matic: 'Matic', gigi: 'Gigi', kopling: 'Kopling' }

export default function PaymentPage() {
  const navigate = useNavigate()
  const { items, total, clearCart } = useCart()
  const { customer } = useAuth()

  const [method, setMethod] = useState('') // 'cash' | 'qris'
  const [qrisImageUrl, setQrisImageUrl] = useState(null)
  const [storeName, setStoreName] = useState('')
  const [loading, setLoading] = useState(false)
  const [showQris, setShowQris] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    supabase.from('store_profile').select('name, qris_image_url').eq('id', 1).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setStoreName(data.name)
          setQrisImageUrl(data.qris_image_url)
        }
      })
  }, [])

  if (items.length === 0 && !submitted) {
    return (
      <div className="page">
        <Navbar storeName={storeName} />
        <div className="empty-state">
          <div className="empty-state__icon">🛒</div>
          <p className="empty-state__title">Keranjang kosong</p>
          <button className="btn btn--primary" onClick={() => navigate('/home')} style={{ marginTop: 20 }}>
            Kembali ke Menu
          </button>
        </div>
      </div>
    )
  }

  const handleConfirm = async () => {
    if (!method) return
    if (method === 'qris' && !showQris) {
      setShowQris(true)
      return
    }
    await submitOrder(method)
  }

  const submitOrder = async (payMethod) => {
    setLoading(true)
    try {
      const serviceItems = items.filter(i => i.type === 'service')
      const productItems = items.filter(i => i.type === 'product')
      let orderType = 'mixed'
      if (serviceItems.length && !productItems.length) orderType = 'service'
      if (productItems.length && !serviceItems.length) orderType = 'product'

      const motorLabel = `${customer.merk_motor} (${JENIS_LABEL[customer.jenis_motor]}) - ${customer.plat_nomor}`

      const { error } = await supabase.from('web_orders').insert({
        customer_id: customer.id,
        customer_name: customer.nama,
        customer_phone: customer.no_telepon,
        customer_motor: motorLabel,
        order_type: orderType,
        items: items.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, type: i.type })),
        total,
        payment_method: payMethod,
        status: 'pending',
        is_read_by_admin: false,
      })

      if (error) throw error

      clearCart()
      setSubmitted(true)
      setShowQris(false)
    } catch (err) {
      alert('Gagal mengirim order: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Success State
  if (submitted) {
    return (
      <div className="success-page fade-in">
        <div className="success-icon">✅</div>
        <h1 className="h1" style={{ marginBottom: 8 }}>Order Terkirim!</h1>
        <p className="body text-sub" style={{ marginBottom: 24 }}>
          Order Anda sudah diterima kasir dan sedang diproses.
        </p>
        <div className="card" style={{ width: '100%', maxWidth: 360, marginBottom: 28, textAlign: 'left' }}>
          <div className="card__body">
            <p className="caption">Detail customer</p>
            <p className="h4" style={{ marginTop: 4 }}>{customer.nama}</p>
            <p className="body-sm text-sub">{customer.merk_motor} · {customer.plat_nomor}</p>
            <div className="divider" />
            <p className="caption">Total pembayaran</p>
            <p className="h2 text-primary" style={{ marginTop: 4 }}>{formatRp(total)}</p>
            <p className="body-sm text-sub" style={{ marginTop: 4 }}>
              Metode: {method === 'cash' ? '💵 Cash' : '📱 QRIS'}
            </p>
          </div>
        </div>
        <button
          className="btn btn--primary btn--lg btn--full"
          style={{ maxWidth: 360 }}
          onClick={() => navigate('/home')}
          id="success-back-home-btn"
        >
          Kembali ke Menu Utama
        </button>
      </div>
    )
  }

  return (
    <div className="page">
      <Navbar storeName={storeName} />

      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} id="payment-back-btn">←</button>
        <div>
          <h2 className="page-header__title">Pembayaran</h2>
          <p className="caption">Pilih metode pembayaran</p>
        </div>
      </div>

      <div className="list-container">

        {/* Ringkasan Order */}
        <div className="card">
          <div className="card__body">
            <p className="home-section-title" style={{ marginBottom: 10 }}>Ringkasan Order</p>
            {items.map(item => (
              <div key={`${item.id}-${item.type}`} style={{ display:'flex', justifyContent:'space-between', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <span className={`cart-item__type-badge cart-item__type-badge--${item.type}`} style={{ marginRight: 6 }}>
                    {item.type === 'service' ? 'Servis' : 'Produk'}
                  </span>
                  <span className="body-sm">{item.name}</span>
                  {item.qty > 1 && <span className="caption"> ×{item.qty}</span>}
                </div>
                <span className="body-sm font-semibold text-primary">{formatRp(item.price * item.qty)}</span>
              </div>
            ))}
            <div className="divider" />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span className="h4">Total</span>
              <span className="h2 text-primary">{formatRp(total)}</span>
            </div>
          </div>
        </div>

        {/* Pilih Metode */}
        <div>
          <p className="home-section-title">Metode Pembayaran</p>
          <div className="payment-method">
            <button
              className={`method-card ${method === 'cash' ? 'active' : ''}`}
              onClick={() => { setMethod('cash'); setShowQris(false) }}
              id="payment-cash-btn"
            >
              <div className="method-card__icon">💵</div>
              <div className="method-card__label">Cash</div>
              <p className="body-sm text-sub" style={{ marginTop: 4 }}>Bayar ke kasir</p>
            </button>

            <button
              className={`method-card ${method === 'qris' ? 'active' : ''}`}
              onClick={() => setMethod('qris')}
              id="payment-qris-btn"
            >
              <div className="method-card__icon">📱</div>
              <div className="method-card__label">QRIS</div>
              <p className="body-sm text-sub" style={{ marginTop: 4 }}>Scan QR Code</p>
            </button>
          </div>
        </div>

        {/* Info Cash */}
        {method === 'cash' && (
          <div className="card fade-in" style={{ background: '#f0fdf4', border:'1.5px solid #bbf7d0' }}>
            <div className="card__body">
              <p className="h4">💵 Pembayaran Cash</p>
              <p className="body-sm text-sub" style={{ marginTop: 6, lineHeight: 1.6 }}>
                Klik konfirmasi, lalu serahkan pembayaran sebesar <strong className="text-primary">{formatRp(total)}</strong> langsung ke kasir saat pengambilan kendaraan.
              </p>
            </div>
          </div>
        )}

        {/* Info QRIS */}
        {method === 'qris' && !showQris && (
          <div className="card fade-in" style={{ background: '#f0f9ff', border:'1.5px solid #bae6fd' }}>
            <div className="card__body">
              <p className="h4">📱 Pembayaran QRIS</p>
              <p className="body-sm text-sub" style={{ marginTop: 6, lineHeight: 1.6 }}>
                Setelah konfirmasi, QR Code akan ditampilkan. Scan menggunakan aplikasi dompet digital (GoPay, OVO, Dana, dll) dan masukkan nominal <strong style={{ color:'#0369a1' }}>{formatRp(total)}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Confirm Button */}
        {method && (
          <button
            className="btn btn--primary btn--full btn--lg"
            onClick={handleConfirm}
            disabled={loading}
            id="payment-confirm-btn"
          >
            {loading ? (
              <><span className="loading-spinner" style={{ width:20, height:20, borderWidth:2 }} /> Memproses...</>
            ) : method === 'qris' && !showQris ? (
              '📱 Lihat QR Code'
            ) : (
              '✅ Konfirmasi Order'
            )}
          </button>
        )}
      </div>

      {/* QRIS Modal */}
      {showQris && (
        <div className="modal-overlay" onClick={() => setShowQris(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-sheet__handle" />
            <h2 className="h2 text-center" style={{ marginBottom: 8 }}>Scan QRIS</h2>

            <div className="qris-amount">
              <p className="qris-amount__label">Total yang harus dibayar</p>
              <p className="qris-amount__value">{formatRp(total)}</p>
            </div>

            {qrisImageUrl ? (
              <div className="qris-image-wrapper">
                <img
                  src={qrisImageUrl}
                  alt="QR Code QRIS"
                  className="qris-image"
                  id="qris-code-image"
                />
              </div>
            ) : (
              <div style={{ textAlign:'center', padding: '32px 0', color:'var(--text-muted)' }}>
                <p style={{ fontSize:40 }}>📷</p>
                <p className="body-sm" style={{ marginTop: 8 }}>QR Code belum dikonfigurasi oleh admin</p>
              </div>
            )}

            <p className="qris-instruction">
              Scan QR di atas dengan dompet digital Anda<br/>
              (GoPay, OVO, Dana, ShopeePay, dll)<br/>
              <strong>Masukkan nominal: {formatRp(total)}</strong>
            </p>

            <button
              className="btn btn--primary btn--full btn--lg"
              onClick={() => submitOrder('qris')}
              disabled={loading}
              id="qris-sudah-bayar-btn"
            >
              {loading ? (
                <><span className="loading-spinner" style={{ width:20, height:20, borderWidth:2 }} /> Memproses...</>
              ) : (
                '✅ Sudah Bayar'
              )}
            </button>

            <button
              className="btn btn--ghost btn--full"
              onClick={() => setShowQris(false)}
              id="qris-close-btn"
              style={{ marginTop: 10 }}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
