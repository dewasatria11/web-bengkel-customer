import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { supabase } from '../supabaseClient'

const JENIS_LABEL = { matic: 'Matic', gigi: 'Gigi', kopling: 'Kopling' }

export default function HomePage() {
  const { customer, logout } = useAuth()
  const navigate = useNavigate()
  const [storeName, setStoreName] = useState('')

  useEffect(() => {
    supabase
      .from('store_profile')
      .select('name')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => { if (data) setStoreName(data.name) })
  }, [])

  if (!customer) return null

  const motorLabel = `${customer.merk_motor} (${JENIS_LABEL[customer.jenis_motor] || customer.jenis_motor})`

  return (
    <div className="page">
      <Navbar storeName={storeName} />

      {/* Welcome Banner */}
      <div className="home-welcome" style={{ position: 'relative' }}>
        {/* Badge Antrian */}
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: '#fff',
          color: 'var(--primary)',
          padding: '6px 12px',
          borderRadius: 8,
          fontWeight: 800,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', marginBottom: 2, color: 'var(--text-sub)' }}>Antrian</p>
          <p style={{ fontSize: 24, lineHeight: 1 }}>#{customer.antrian}</p>
        </div>

        <p className="home-welcome__greeting">Selamat datang kembali 👋</p>
        <h1 className="home-welcome__name">{customer.nama}</h1>
        <div className="home-welcome__motor">
          🏍️ {motorLabel} &nbsp;·&nbsp; {customer.plat_nomor}
        </div>
      </div>

      {/* Main Content */}
      <div className="home-content fade-in">

        {/* Menu Utama */}
        <p className="home-section-title">Pilih Layanan</p>
        <div className="menu-grid">
          <button
            className="menu-card"
            onClick={() => navigate('/services')}
            id="menu-service-btn"
          >
            <div className="menu-card__icon menu-card__icon--green">🔧</div>
            <p className="menu-card__title">Jenis Servis</p>
            <p className="menu-card__sub">Pilih paket servis kendaraan Anda</p>
          </button>

          <button
            className="menu-card"
            onClick={() => navigate('/products')}
            id="menu-product-btn"
          >
            <div className="menu-card__icon menu-card__icon--blue">🛒</div>
            <p className="menu-card__title">Beli Produk</p>
            <p className="menu-card__sub">Spare part & produk tersedia</p>
          </button>
        </div>

        {/* Info Card */}
        <div className="card" style={{ marginTop: 8 }}>
          <div className="card__body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>ℹ️</span>
              <div>
                <p className="h4">Info Kendaraan Anda</p>
                <p className="body-sm text-sub" style={{ marginTop: 4 }}>
                  {customer.merk_motor} &bull; {JENIS_LABEL[customer.jenis_motor]} &bull; {customer.plat_nomor}
                </p>
                <p className="body-sm text-sub">📞 {customer.no_telepon}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          className="btn btn--ghost btn--full"
          onClick={logout}
          id="logout-btn"
          style={{ marginTop: 16 }}
        >
          🚪 Keluar Akun
        </button>
      </div>
    </div>
  )
}
