import { createClient } from '@supabase/supabase-js'

// Nanti ganti dengan URL dan ANON KEY asli milikmu dari dashboard Supabase
const supabaseUrl = 'https://mddlplvomrhtwhblbpyl.supabase.co' 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kZGxwbHZvbXJodHdoYmxicHlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDM4NjQsImV4cCI6MjA5MDg3OTg2NH0.zP8hm7oyKlBGBSFmTl_ngtmSNDI661N0V7_wmC1a1RY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
