import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Navbar from '../components/Navbar'
import { useCart } from '../context/CartContext'

const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function ProductPage() {
  const navigate = useNavigate()
  const { addItem, updateQty, items, count, total } = useCart()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [storeName, setStoreName] = useState('')

  useEffect(() => {
    supabase.from('store_profile').select('name').eq('id', 1).maybeSingle()
      .then(({ data }) => { if (data) setStoreName(data.name) })

    supabase.from('products').select('*').gt('stock', 0).order('name')
      .then(({ data, error }) => {
        if (!error) setProducts(data || [])
        setLoading(false)
      })
  }, [])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const getQty = (id) => {
    const it = items.find(i => i.id === id && i.type === 'product')
    return it ? it.qty : 0
  }

  return (
    <div className="page">
      <Navbar storeName={storeName} />

      {/* Page Header */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/home')} id="product-back-btn">←</button>
        <div>
          <h2 className="page-header__title">Beli Produk</h2>
          <p className="caption">Spare part & produk tersedia</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <span className="search-bar__icon">🔍</span>
        <input
          type="search"
          placeholder="Cari produk..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          id="product-search-input"
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ fontSize: 16, color: 'var(--text-muted)' }}>✕</button>
        )}
      </div>

      {/* Product List */}
      {loading ? (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <div className="loading-spinner" />
          <p className="caption" style={{ marginTop: 12 }}>Memuat produk...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📦</div>
          <p className="empty-state__title">
            {search ? 'Produk tidak ditemukan' : 'Belum ada produk'}
          </p>
          <p className="empty-state__sub">
            {search ? `Coba kata kunci lain` : 'Produk belum tersedia'}
          </p>
        </div>
      ) : (
        <div className="list-container">
          {filtered.map(product => {
            const qty = getQty(product.id)
            return (
              <div key={product.id} className="product-card">
                <div className="product-card__icon">📦</div>
                <div className="product-card__info">
                  <p className="product-card__name">{product.name}</p>
                  <p className="product-card__stock">Stok: {product.stock}</p>
                  <p className="product-card__price">{formatRp(product.price)}</p>
                </div>
                <div className="product-card__action">
                  {qty === 0 ? (
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={() => addItem({ id: product.id, name: product.name, price: product.price, type: 'product' })}
                      id={`add-product-${product.id}`}
                    >
                      + Tambah
                    </button>
                  ) : (
                    <div className="qty-control">
                      <button
                        className="qty-btn"
                        onClick={() => updateQty(product.id, 'product', -1)}
                        id={`dec-product-${product.id}`}
                      >−</button>
                      <span className="qty-value">{qty}</span>
                      <button
                        className="qty-btn qty-btn--add"
                        onClick={() => updateQty(product.id, 'product', 1)}
                        disabled={qty >= product.stock}
                        id={`inc-product-${product.id}`}
                      >+</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* FAB Cart */}
      {count > 0 && (
        <button
          className="fab"
          onClick={() => navigate('/cart')}
          id="product-cart-fab"
        >
          🛒 Lihat Keranjang ({count}) &nbsp;·&nbsp; {formatRp(total)}
        </button>
      )}
    </div>
  )
}
