import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Navbar from '../components/Navbar'
import { useCart } from '../context/CartContext'

const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function ServicePage() {
  const navigate = useNavigate()
  const { addItem, updateQty, items, count, total } = useCart()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [storeName, setStoreName] = useState('')

  useEffect(() => {
    supabase.from('store_profile').select('name').eq('id', 1).maybeSingle()
      .then(({ data }) => { if (data) setStoreName(data.name) })

    supabase.from('services').select('*').eq('is_active', true).order('name')
      .then(({ data, error }) => {
        if (!error) setServices(data || [])
        setLoading(false)
      })
  }, [])

  const getQty = (id) => {
    const it = items.find(i => i.id === id && i.type === 'service')
    return it ? it.qty : 0
  }

  return (
    <div className="page">
      <Navbar storeName={storeName} />

      {/* Page Header */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/home')} id="service-back-btn">←</button>
        <div>
          <h2 className="page-header__title">Pilih Jenis Servis</h2>
          <p className="caption">Pilih satu atau lebih paket servis</p>
        </div>
      </div>

      {/* Service List */}
      {loading ? (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <div className="loading-spinner" />
          <p className="caption" style={{ marginTop: 12 }}>Memuat paket servis...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🔧</div>
          <p className="empty-state__title">Belum ada paket servis</p>
          <p className="empty-state__sub">Paket servis belum dikonfigurasi oleh admin</p>
        </div>
      ) : (
        <div className="list-container">
          {services.map(svc => {
            const qty = getQty(svc.id)
            return (
              <div
                key={svc.id}
                className={`service-card ${qty > 0 ? 'selected' : ''}`}
              >
                <div className="service-card__icon">🔧</div>
                <div className="service-card__info">
                  <p className="service-card__name">{svc.name}</p>
                  {svc.description && (
                    <p className="service-card__desc">{svc.description}</p>
                  )}
                  <p className="service-card__price">{formatRp(svc.price)}</p>
                </div>
                <div className="service-card__action">
                  {qty === 0 ? (
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={() => addItem({ id: svc.id, name: svc.name, price: svc.price, type: 'service' })}
                      id={`add-service-${svc.id}`}
                    >
                      + Pilih
                    </button>
                  ) : (
                    <div className="qty-control">
                      <button
                        className="qty-btn"
                        onClick={() => updateQty(svc.id, 'service', -1)}
                        id={`dec-service-${svc.id}`}
                      >−</button>
                      <span className="qty-value">{qty}</span>
                      <button
                        className="qty-btn qty-btn--add"
                        onClick={() => updateQty(svc.id, 'service', 1)}
                        id={`inc-service-${svc.id}`}
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
          id="service-cart-fab"
        >
          🛒 Lihat Keranjang ({count}) &nbsp;·&nbsp; {formatRp(total)}
        </button>
      )}
    </div>
  )
}
