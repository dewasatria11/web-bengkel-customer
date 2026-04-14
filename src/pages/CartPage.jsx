import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import Navbar from '../components/Navbar'

const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function CartPage() {
  const navigate = useNavigate()
  const { items, updateQty, removeItem, total, count, clearCart } = useCart()

  if (items.length === 0) {
    return (
      <div className="page">
        <Navbar />
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)} id="cart-back-btn">←</button>
          <h2 className="page-header__title">Keranjang</h2>
        </div>
        <div className="empty-state">
          <div className="empty-state__icon">🛒</div>
          <p className="empty-state__title">Keranjang kosong</p>
          <p className="empty-state__sub">Tambahkan servis atau produk terlebih dahulu</p>
          <button
            className="btn btn--primary"
            onClick={() => navigate('/home')}
            style={{ marginTop: 20 }}
            id="cart-empty-go-home"
          >
            Pilih Layanan
          </button>
        </div>
      </div>
    )
  }

  const serviceItems = items.filter(i => i.type === 'service')
  const productItems = items.filter(i => i.type === 'product')

  return (
    <div className="page">
      <Navbar />

      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} id="cart-back-btn">←</button>
        <div>
          <h2 className="page-header__title">Keranjang</h2>
          <p className="caption">{count} item dipilih</p>
        </div>
      </div>

      <div className="list-container">

        {/* Servis */}
        {serviceItems.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span>🔧</span>
              <p className="home-section-title" style={{ marginBottom: 0 }}>Paket Servis</p>
            </div>
            {serviceItems.map(item => (
              <div key={`${item.id}-${item.type}`} className="cart-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span className="cart-item__type-badge cart-item__type-badge--service">Servis</span>
                  </div>
                  <p className="h4">{item.name}</p>
                  <p className="body-sm text-primary" style={{ fontWeight: 700, marginTop: 2 }}>
                    {formatRp(item.price * item.qty)}
                  </p>
                  {item.qty > 1 && (
                    <p className="body-sm text-sub">{formatRp(item.price)} × {item.qty}</p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div className="qty-control">
                    <button className="qty-btn" onClick={() => updateQty(item.id, 'service', -1)} id={`cart-dec-${item.id}`}>−</button>
                    <span className="qty-value">{item.qty}</span>
                    <button className="qty-btn qty-btn--add" onClick={() => updateQty(item.id, 'service', 1)} id={`cart-inc-${item.id}`}>+</button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id, 'service')}
                    style={{ fontSize: 13, color: 'var(--danger)' }}
                    id={`cart-remove-${item.id}`}
                  >
                    🗑 Hapus
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Produk */}
        {productItems.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, marginTop: serviceItems.length > 0 ? 8 : 0 }}>
              <span>📦</span>
              <p className="home-section-title" style={{ marginBottom: 0 }}>Produk</p>
            </div>
            {productItems.map(item => (
              <div key={`${item.id}-${item.type}`} className="cart-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span className="cart-item__type-badge cart-item__type-badge--product">Produk</span>
                  </div>
                  <p className="h4">{item.name}</p>
                  <p className="body-sm text-primary" style={{ fontWeight: 700, marginTop: 2 }}>
                    {formatRp(item.price * item.qty)}
                  </p>
                  {item.qty > 1 && (
                    <p className="body-sm text-sub">{formatRp(item.price)} × {item.qty}</p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div className="qty-control">
                    <button className="qty-btn" onClick={() => updateQty(item.id, 'product', -1)} id={`cart-dec-${item.id}`}>−</button>
                    <span className="qty-value">{item.qty}</span>
                    <button className="qty-btn qty-btn--add" onClick={() => updateQty(item.id, 'product', 1)} id={`cart-inc-${item.id}`}>+</button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id, 'product')}
                    style={{ fontSize: 13, color: 'var(--danger)' }}
                    id={`cart-remove-${item.id}`}
                  >
                    🗑 Hapus
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Clear cart */}
        <button
          className="btn btn--ghost btn--sm"
          onClick={clearCart}
          id="cart-clear-btn"
          style={{ alignSelf: 'flex-start', color: 'var(--danger)' }}
        >
          🗑 Kosongkan Keranjang
        </button>
      </div>

      {/* Summary Fixed Bottom */}
      <div className="cart-summary">
        <div className="cart-total">
          <span className="cart-total__label">Total Pembayaran</span>
          <span className="cart-total__amount">{formatRp(total)}</span>
        </div>
        <button
          className="btn btn--primary btn--full btn--lg"
          onClick={() => navigate('/payment')}
          id="cart-checkout-btn"
        >
          Lanjut Bayar →
        </button>
      </div>
    </div>
  )
}
