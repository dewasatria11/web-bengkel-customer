import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import RegisterPage from './pages/RegisterPage'
import LoginPage    from './pages/LoginPage'
import HomePage     from './pages/HomePage'
import ServicePage  from './pages/ServicePage'
import ProductPage  from './pages/ProductPage'
import CartPage     from './pages/CartPage'
import PaymentPage  from './pages/PaymentPage'

// Guard: redirect ke login jika belum login
function PrivateRoute({ children }) {
  const { customer, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="loading-spinner" />
    </div>
  )
  return customer ? children : <Navigate to="/login" replace />
}

// Guard: redirect ke home jika sudah login
function GuestRoute({ children }) {
  const { customer, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="loading-spinner" />
    </div>
  )
  return customer ? <Navigate to="/home" replace /> : children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Root → redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Guest only */}
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />

      {/* Authenticated only */}
      <Route path="/home"     element={<PrivateRoute><HomePage /></PrivateRoute>} />
      <Route path="/services" element={<PrivateRoute><ServicePage /></PrivateRoute>} />
      <Route path="/products" element={<PrivateRoute><ProductPage /></PrivateRoute>} />
      <Route path="/cart"     element={<PrivateRoute><CartPage /></PrivateRoute>} />
      <Route path="/payment"  element={<PrivateRoute><PaymentPage /></PrivateRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
