import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type AdminClient = SupabaseClient<Database>

function getAdminEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'SUPABASE_SECRET_KEY') {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required Supabase admin environment variable: ${name}`)
  }

  return value
}

export function createAdminClient() {
  return createClient<Database>(
    getAdminEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getAdminEnv('SUPABASE_SECRET_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}