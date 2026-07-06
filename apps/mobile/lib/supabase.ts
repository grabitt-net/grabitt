import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

// Same Supabase project as web. Anon key is public by design.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zljidtzinlgbtlzuzalh.supabase.co'
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsamlkdHppbmxnYnRsenV6YWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODQxODQsImV4cCI6MjA5Nzk2MDE4NH0.AgMvpk34J5ulzs6vx0CKQM1-MaQ66CMF45Fjs4dkhE8'

export const supabase = createClient(url, anon, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
