import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import {
  cancelPendingGuestMerge,
  finalizePendingGuestMerge,
  getExpiredMergeIntentCookieOptions,
  MERGE_INTENT_COOKIE_NAME,
} from '@/lib/auth/merge'
import { sanitizeNextPath } from '@/lib/auth/auth-state'

function redirectWithMergeIntent(url: string, clearMergeIntent = false) {
  const response = NextResponse.redirect(url)

  if (clearMergeIntent) {
    response.cookies.set(MERGE_INTENT_COOKIE_NAME, '', getExpiredMergeIntentCookieOptions())
  }

  return response
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const shouldFinalizeMerge = searchParams.get('merge') === '1'
  const token_hash = searchParams.get('token_hash')
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
  if (!authSucceeded && token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    authSucceeded = !error
  }

  if (!authSucceeded) {
    await cancelPendingGuestMerge().catch(() => undefined)
    return redirectWithMergeIntent(`${origin}/login?error=auth_failed`, true)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    await cancelPendingGuestMerge().catch(() => undefined)
    return redirectWithMergeIntent(`${origin}/login?error=auth_failed`, true)
  }

  if (!shouldFinalizeMerge) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  try {
    const mergeResult = await finalizePendingGuestMerge(user)

    if (mergeResult.status === 'merged') {
      return redirectWithMergeIntent(`${origin}/settings?merged=1`, true)
    }

    if (mergeResult.status === 'none' || mergeResult.status === 'expired' || mergeResult.status === 'invalid') {
      return redirectWithMergeIntent(`${origin}/settings?merge=expired`, true)
    }

    if (mergeResult.status === 'invalid_target') {
      return redirectWithMergeIntent(`${origin}/settings?merge=resume`)
    }
  } catch (error) {
    console.error('guest merge finalization failed during auth callback', {
      message: error instanceof Error ? error.message : String(error),
      next,
      userId: user.id,
    })

    return redirectWithMergeIntent(`${origin}/settings?merge=resume`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
