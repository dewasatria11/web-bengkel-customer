// Script testing interaksi Supabase dan Cloudflare Worker
// Node 22+ mendukung global fetch secara native, tidak perlu node-fetch
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mddlplvomrhtwhblbpyl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kZGxwbHZvbXJodHdoYmxicHlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDM4NjQsImV4cCI6MjA5MDg3OTg2NH0.zP8hm7oyKlBGBSFmTl_ngtmSNDI661N0V7_wmC1a1RY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const isToday = (dateString) => {
  if (!dateString) return false;
  const d = new Date(dateString);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
};

async function test() {
  console.log('--- START TESTING LOGIN QUEUE ROUTE ---');

  // 1. Ambil store_id dari store_profile
  const { data: store, error: storeError } = await supabase
    .from('store_profile')
    .select('store_id')
    .eq('id', 1)
    .maybeSingle();

  if (storeError) {
    console.error('Error fetching store:', storeError);
    return;
  }
  const storeId = store?.store_id?.trim();
  console.log('Store ID dari Supabase:', storeId);

  if (!storeId) {
    console.error('FATAL: store_id kosong di tabel store_profile. Hentikan test.');
    return;
  }

  // 2. Ambil customer untuk simulasi login
  const { data: customers, error: custError } = await supabase
    .from('customers')
    .select('*')
    .limit(1);

  if (custError || !customers || customers.length === 0) {
    console.error('Tidak ada customer di DB untuk ditest:', custError);
    return;
  }

  const customer = customers[0];
  console.log(`Ditemukan Customer Uji: ID=${customer.id}, Nama=${customer.nama}, No Telp=${customer.no_telepon}, CreatedAt=${customer.created_at}, Antrian=${customer.antrian}`);

  const createdIsToday = isToday(customer.created_at);
  console.log(`Apakah data customer terdaftar hari ini?`, createdIsToday);

  if (!createdIsToday) {
    console.log('Skenario: Hari berbeda detected. Melakukan simulasi refresh antrian...');

    const { start, end } = getTodayRange();
    const { count, error: countError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start)
      .lte('created_at', end);

    if (countError) {
      console.error("Error counting today's customers:", countError);
      return;
    }

    const nextAntrian = (count || 0) + 1;
    console.log(`Jumlah antrian hari ini di DB: ${count || 0}. Nomor antrian berikutnya: ${nextAntrian}`);

    console.log(`Mengupdate created_at customer ${customer.id} ke hari ini dan antrian ke ${nextAntrian}...`);
    const { data: updatedCustomer, error: updateError } = await supabase
      .from('customers')
      .update({
        created_at: new Date().toISOString(),
        antrian: nextAntrian
      })
      .eq('id', customer.id)
      .select()
      .single();

    if (updateError) {
      console.error('Gagal update customer:', updateError);
      return;
    }
    console.log('Update Supabase Berhasil!');

    // Panggil Worker
    console.log(`Mengirim notifikasi antrian ke Worker... store_id=${storeId}, queue_number=${nextAntrian}`);
    try {
      const response = await fetch('https://server.soundboxqris123.workers.dev/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, queue_number: nextAntrian })
      });

      console.log(`Worker Response Status: ${response.status}`);
      const resText = await response.text();
      console.log(`Worker Response Body:`, resText);

    } catch (fetchErr) {
      console.error('Gagal memanggil Worker:', fetchErr);
    }

    // Pulihkan data customer ke nilai awal
    console.log(`Memulihkan data customer ${customer.id} ke nilai awal...`);
    await supabase
      .from('customers')
      .update({
        created_at: customer.created_at,
        antrian: customer.antrian
      })
      .eq('id', customer.id);
    console.log('Data customer berhasil dipulihkan!');

  } else {
    console.log('Skenario: Hari sama detected. Tidak ada antrian yang di-refresh atau dikirim ke Cloudflare Worker.');
    console.log('[OK] Tidak ada duplikasi pengiriman antrian.');
  }

  console.log('--- END TESTING ---');
}

test();