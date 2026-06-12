import { createClient } from '@supabase/supabase-js'
import { getTrustedAccessToken, isBackendConfigured } from './backend'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Will be null if env vars not set — app falls back to mock data
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(
      supabaseUrl,
      supabaseAnonKey,
      isBackendConfigured ? { accessToken: getTrustedAccessToken } : undefined
    )
  : null

export const isSupabaseConfigured = !!supabase

if (!isSupabaseConfigured) {
  console.info(
    '[TutorSpace] Supabase not configured — running with mock data.\n' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local to connect.'
  )
}
