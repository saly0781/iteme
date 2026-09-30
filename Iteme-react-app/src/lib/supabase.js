import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn(
    'Missing Supabase env vars. Copy .env.example to .env and fill in your project URL/anon key. Account features will not work until then.'
  )
}

// Falls back to a placeholder so createClient doesn't throw and break the
// rest of the site (which doesn't depend on Supabase) before .env is set up.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
)
