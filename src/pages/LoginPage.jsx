import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [noTelepon, setNoTelepon] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const val = noTelepon.trim()
    if (!val) { setError('Masukkan nomor telepon Anda'); return }
    if (!/^0\d{8,12}$/.test(val)) { setError('Format: 08xxxxxxxxxx'); return }

    setLoading(true)
    setError('')
    try {
      await login(val)
      navigate('/home')
    } catch (err) {
      setError(err.message || 'Login gagal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {/* Hero */}
      <div className="auth-hero">
        <div className="auth-hero__icon">🔑</div>
        <h1 className="auth-hero__title">Masuk Akun</h1>
        <p className="auth-hero__sub">Masukkan nomor telepon yang terdaftar</p>
      </div>

      {/* Form */}
      <div className="auth-body">
        <form className="auth-form" onSubmit={handleSubmit} noValidate id="login-form">

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: 14,
              color: '#dc2626'
            }}>
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="login-telp">Nomor Telepon</label>
            <input
              id="login-telp"
              type="tel"
              className={`form-input ${error ? 'error' : ''}`}
              placeholder="08xxxxxxxxxx"
              value={noTelepon}
              onChange={e => setNoTelepon(e.target.value)}
              autoComplete="tel"
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--full btn--lg"
            disabled={loading}
            id="login-submit-btn"
            style={{ marginTop: 8 }}
          >
            {loading ? (
              <><span className="loading-spinner" style={{ width:20, height:20, borderWidth:2 }} /> Masuk...</>
            ) : (
              '🔑 Masuk'
            )}
          </button>
        </form>

        <p className="auth-switch">
          Belum punya akun?{' '}
          <Link to="/register" id="go-to-register-link">Daftar di sini</Link>
        </p>
      </div>
    </div>
  )
}
