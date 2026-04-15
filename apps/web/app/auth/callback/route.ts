import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { sanitizeNextPath } from '@/lib/auth/auth-state'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = sanitizeNextPath(searchParams.get('next'), '/dashboard')

  const supabase = await createClient()
  let authSucceeded = false

  // PKCE flow (OAuth + magic link)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    authSucceeded = !error
  }

  // Email confirmation / recovery via token hash
  if (!authSucceeded && tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    authSucceeded = !error
  }

  if (!authSucceeded) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
