import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const JENIS_MOTOR = [
  { value: 'matic',   label: 'Matic (Automatic)' },
  { value: 'gigi',    label: 'Gigi (Bebek)' },
  { value: 'kopling', label: 'Kopling (Manual)' },
]

const MERK_MOTOR = [
  'Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'TVS',
  'Royal Enfield', 'Viar', 'Gesits', 'Piaggio / Vespa',
  'Benelli', 'KTM', 'Triumph', 'BMW', 'Lainnya'
]

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    nama: '',
    no_telepon: '',
    jenis_motor: '',
    merk_motor: '',
    plat_nomor: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const set = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.nama.trim())          e.nama = 'Nama wajib diisi'
    if (!form.no_telepon.trim())    e.no_telepon = 'Nomor telepon wajib diisi'
    else if (!/^0\d{8,12}$/.test(form.no_telepon.trim()))
                                    e.no_telepon = 'Format: 08xxxxxxxxxx'
    if (!form.jenis_motor)          e.jenis_motor = 'Pilih jenis motor'
    if (!form.merk_motor)           e.merk_motor = 'Pilih merk motor'
    if (!form.plat_nomor.trim())    e.plat_nomor = 'Plat nomor wajib diisi'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    setApiError('')
    try {
      await register({
        ...form,
        plat_nomor: form.plat_nomor.toUpperCase().trim()
      })
      navigate('/home')
    } catch (err) {
      setApiError(err.message || 'Gagal mendaftar, coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {/* Hero */}
      <div className="auth-hero">
        <div className="auth-hero__icon">🔧</div>
        <h1 className="auth-hero__title">Daftar Akun</h1>
        <p className="auth-hero__sub">Lengkapi data diri & kendaraan Anda</p>
      </div>

      {/* Form */}
      <div className="auth-body">
        <form className="auth-form" onSubmit={handleSubmit} noValidate id="register-form">

          {/* API Error */}
          {apiError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: 14,
              color: '#dc2626'
            }}>
              ⚠️ {apiError}
            </div>
          )}

          {/* Nama */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-nama">Nama Lengkap</label>
            <input
              id="reg-nama"
              type="text"
              className={`form-input ${errors.nama ? 'error' : ''}`}
              placeholder="Contoh: Budi Santoso"
              value={form.nama}
              onChange={set('nama')}
              autoComplete="name"
            />
            {errors.nama && <span className="form-error">{errors.nama}</span>}
          </div>

          {/* No Telepon */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-telp">Nomor Telepon</label>
            <input
              id="reg-telp"
              type="tel"
              className={`form-input ${errors.no_telepon ? 'error' : ''}`}
              placeholder="08xxxxxxxxxx"
              value={form.no_telepon}
              onChange={set('no_telepon')}
              autoComplete="tel"
            />
            {errors.no_telepon && <span className="form-error">{errors.no_telepon}</span>}
          </div>

          {/* Jenis Motor */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-jenis">Jenis Motor</label>
            <select
              id="reg-jenis"
              className={`form-select ${errors.jenis_motor ? 'error' : ''}`}
              value={form.jenis_motor}
              onChange={set('jenis_motor')}
            >
              <option value="">-- Pilih Jenis Motor --</option>
              {JENIS_MOTOR.map(j => (
                <option key={j.value} value={j.value}>{j.label}</option>
              ))}
            </select>
            {errors.jenis_motor && <span className="form-error">{errors.jenis_motor}</span>}
          </div>

          {/* Merk Motor */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-merk">Merk Motor</label>
            <select
              id="reg-merk"
              className={`form-select ${errors.merk_motor ? 'error' : ''}`}
              value={form.merk_motor}
              onChange={set('merk_motor')}
            >
              <option value="">-- Pilih Merk Motor --</option>
              {MERK_MOTOR.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {errors.merk_motor && <span className="form-error">{errors.merk_motor}</span>}
          </div>

          {/* Plat Nomor */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-plat">Nomor Plat</label>
            <input
              id="reg-plat"
              type="text"
              className={`form-input ${errors.plat_nomor ? 'error' : ''}`}
              placeholder="Contoh: B 1234 ABC"
              value={form.plat_nomor}
              onChange={set('plat_nomor')}
              style={{ textTransform: 'uppercase' }}
            />
            {errors.plat_nomor && <span className="form-error">{errors.plat_nomor}</span>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn--primary btn--full btn--lg"
            disabled={loading}
            id="register-submit-btn"
            style={{ marginTop: 8 }}
          >
            {loading ? (
              <><span className="loading-spinner" style={{ width:20, height:20, borderWidth:2 }} /> Mendaftar...</>
            ) : (
              '✅ Daftar Sekarang'
            )}
          </button>
        </form>

        {/* Switch to Login */}
        <p className="auth-switch">
          Sudah punya akun?{' '}
          <Link to="/login" id="go-to-login-link">Login di sini</Link>
        </p>
      </div>
    </div>
  )
}
