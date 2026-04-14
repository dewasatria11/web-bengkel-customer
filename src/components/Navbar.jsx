import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function Navbar({ storeName }) {
  const { count } = useCart()
  const navigate = useNavigate()

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <div className="navbar__brand">
          <div className="navbar__logo">🔧</div>
          <span className="navbar__name">{storeName || 'Bengkel POS'}</span>
        </div>
        <div className="navbar__right">
          <button
            className="navbar__cart-btn"
            onClick={() => navigate('/cart')}
            aria-label="Keranjang belanja"
            id="navbar-cart-btn"
          >
            🛒
            {count > 0 && (
              <span className="navbar__badge">{count > 99 ? '99+' : count}</span>
            )}
          </button>
        </div>
      </div>
    </nav>
  )
}
