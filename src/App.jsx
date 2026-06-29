import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { NotificationProvider } from './context/NotificationContext'
import RegisterPage from './pages/RegisterPage'
import LoginPage    from './pages/LoginPage'
import HomePage     from './pages/HomePage'
import ServicePage  from './pages/ServicePage'
import ProductPage  from './pages/ProductPage'
import CartPage     from './pages/CartPage'
import PaymentPage  from './pages/PaymentPage'
import CustomerOrdersPage from './pages/CustomerOrdersPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts from './pages/admin/AdminProducts'
import AdminServices from './pages/admin/AdminServices'
import AdminOrders from './pages/admin/AdminOrders'
import AdminMechanics from './pages/admin/AdminMechanics'
import AdminStats from './pages/admin/AdminStats'
import AdminQueue from './pages/admin/AdminQueue'
import AdminWebSettings from './pages/admin/AdminWebSettings'

// Guard: redirect ke login jika belum login
function PrivateRoute({ children }) {
  const { customer, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="loading-spinner" />
    </div>
  )
  if (!customer) return <Navigate to="/login" replace />
  // Jika admin mencoba akses rute user, lempar ke dashboard admin
  if (customer.is_admin) return <Navigate to="/admin" replace />
  return children
}

// Guard: redirect ke admin page
function AdminRoute({ children }) {
  const { customer, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="loading-spinner" />
    </div>
  )
  if (!customer) return <Navigate to="/login" replace />
  if (!customer.is_admin) return <Navigate to="/home" replace />
  return children
}

// Guard: redirect ke home jika sudah login
function GuestRoute({ children }) {
  const { customer, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="loading-spinner" />
    </div>
  )
  if (customer) {
    return customer.is_admin ? <Navigate to="/admin" replace /> : <Navigate to="/home" replace />
  }
  return children
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
      <Route path="/orders"   element={<PrivateRoute><CustomerOrdersPage /></PrivateRoute>} />

      {/* Admin only */}
      <Route path="/admin"          element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
      <Route path="/admin/services" element={<AdminRoute><AdminServices /></AdminRoute>} />
      <Route path="/admin/orders"   element={<AdminRoute><AdminOrders /></AdminRoute>} />
      <Route path="/admin/mechanics" element={<AdminRoute><AdminMechanics /></AdminRoute>} />
      <Route path="/admin/stats"    element={<AdminRoute><AdminStats /></AdminRoute>} />
      <Route path="/admin/queue"    element={<AdminRoute><AdminQueue /></AdminRoute>} />
      <Route path="/admin/web-settings" element={<AdminRoute><AdminWebSettings /></AdminRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  )
}
