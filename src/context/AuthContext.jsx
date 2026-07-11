import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

const isToday = (dateString) => {
  if (!dateString) return false
  const d = new Date(dateString)
  const today = new Date()
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  )
}

const getTodayRange = () => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

const notifyQueueWorker = (queue_number) => {
  fetch('https://server.soundboxqris123.workers.dev/queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ store_id: 'TOKO_01', queue_number })
  }).catch(console.error);
}

const refreshDailyQueue = async (customerData) => {
  // Ambil data terbaru dari database dulu.
  // Ini mencegah nomor antrian naik 2x kalau refreshDailyQueue terpanggil ganda
  // misalnya karena React StrictMode, tab ganda, atau session localStorage yang belum update.
  const { data: currentCustomer, error: currentError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerData.id)
    .single()

  if (currentError) throw currentError

  if (currentCustomer && isToday(currentCustomer.created_at)) {
    return currentCustomer
  }

  const { start, end } = getTodayRange()
  
  // Hitung jumlah pelanggan yang sudah terdaftar hari ini
  const { count, error: countError } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', start)
    .lte('created_at', end)

  if (countError) throw countError

  const nextAntrian = (count || 0) + 1

  // Update created_at dan antrian
  const { data, error } = await supabase
    .from('customers')
    .update({
      created_at: new Date().toISOString(),
      antrian: nextAntrian
    })
    .eq('id', customerData.id)
    .select()
    .single()

  if (error) throw error

  // Notifikasi ke Worker untuk antrian baru
  notifyQueueWorker(nextAntrian)

  return data
}

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount: restore session dari localStorage
  useEffect(() => {
    async function initSession() {
      const saved = localStorage.getItem('customer_session')
      if (saved) {
        try {
          const session = JSON.parse(saved)
          
          if (session && !session.is_admin) {
            if (!isToday(session.created_at)) {
              // Jika hari berbeda, refresh nomor antrian
              try {
                const refreshed = await refreshDailyQueue(session)
                localStorage.setItem('customer_session', JSON.stringify(refreshed))
                setCustomer(refreshed)
              } catch (e) {
                console.error('Gagal refresh antrian:', e)
                setCustomer(session)
              }
            } else {
              setCustomer(session)
            }
          } else {
            setCustomer(session)
          }
        } catch {
          localStorage.removeItem('customer_session')
        }
      }
      setLoading(false)
    }
    
    initSession()
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

    const { start, end } = getTodayRange()
    const { count, error: countError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start)
      .lte('created_at', end)

    if (countError) throw countError

    const nextAntrian = (count || 0) + 1

    const { data, error } = await supabase
      .from('customers')
      .insert({ 
        nama, 
        no_telepon, 
        jenis_motor, 
        merk_motor, 
        plat_nomor,
        antrian: nextAntrian,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    localStorage.setItem('customer_session', JSON.stringify(data))
    setCustomer(data)
    
    // Notifikasi ke Worker untuk antrian baru
    notifyQueueWorker(nextAntrian)

    return data
  }

  // Login dengan no telepon
  const login = async (no_telepon) => {
    // Admin check - query admin_phones table
    const { data: adminPhone, error: adminErr } = await supabase
      .from('admin_phones')
      .select('id, name, phone')
      .eq('phone', no_telepon)
      .maybeSingle()

    if (adminErr) {
      console.error('Error checking admin_phones:', adminErr)
    }

    if (adminPhone) {
      const adminData = {
        id: `admin-${adminPhone.phone}`,
        nama: adminPhone.name || 'Administrator',
        no_telepon: adminPhone.phone,
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

    let customerData = data
    if (!isToday(customerData.created_at)) {
      customerData = await refreshDailyQueue(customerData)
    }

    localStorage.setItem('customer_session', JSON.stringify(customerData))
    setCustomer(customerData)
    return customerData
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