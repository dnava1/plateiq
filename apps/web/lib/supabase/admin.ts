import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
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

export async function findAuthUserByEmail(admin: AdminClient, email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) {
    return null
  }

  const { data, error } = await admin
    .from('auth_user_email_index')
    .select('user_id, is_anonymous')
    .eq('normalized_email', normalizedEmail)
    .maybeSingle<{ user_id: string; is_anonymous: boolean }>()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return {
    id: data.user_id,
    is_anonymous: data.is_anonymous,
  } as User
}