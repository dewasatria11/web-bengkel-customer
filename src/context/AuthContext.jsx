import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount: restore session dari localStorage
  useEffect(() => {
    const saved = localStorage.getItem('customer_session')
    if (saved) {
      try {
        setCustomer(JSON.parse(saved))
      } catch {
        localStorage.removeItem('customer_session')
      }
    }
    setLoading(false)
  }, [])

  // Register customer baru
  const register = async ({ nama, no_telepon, jenis_motor, merk_motor, plat_nomor }) => {
    // Cek apakah no telepon sudah terdaftar
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('no_telepon', no_telepon)
      .maybeSingle()

    if (existing) {
      throw new Error('Nomor telepon sudah terdaftar. Silakan login.')
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({ nama, no_telepon, jenis_motor, merk_motor, plat_nomor })
      .select()
      .single()

    if (error) throw error

    localStorage.setItem('customer_session', JSON.stringify(data))
    setCustomer(data)
    return data
  }

  // Login dengan no telepon
  const login = async (no_telepon) => {
    // Admin check
    if (no_telepon === '1526422039') {
      const adminData = {
        id: 'admin-1526422039',
        nama: 'Administrator',
        no_telepon: '1526422039',
        is_admin: true
      }
      localStorage.setItem('customer_session', JSON.stringify(adminData))
      setCustomer(adminData)
      return adminData
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('no_telepon', no_telepon)
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error('Nomor telepon tidak terdaftar. Silakan daftar terlebih dahulu.')

    localStorage.setItem('customer_session', JSON.stringify(data))
    setCustomer(data)
    return data
  }

  const logout = () => {
    localStorage.removeItem('customer_session')
    setCustomer(null)
  }

  return (
    <AuthContext.Provider value={{ customer, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
