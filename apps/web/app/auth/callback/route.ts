import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  DISCARD_GUEST_COOKIE_NAME,
  EXISTING_GOOGLE_IDENTITY_ERROR_CODE,
  EXISTING_GOOGLE_UPGRADE_MODE,
  getDiscardGuestCookieOptions,
  getExistingGoogleUpgradeRetryRedirect,
  getExpiredDiscardGuestCookieOptions,
} from '@/lib/auth/google-upgrade'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { sanitizeNextPath } from '@/lib/auth/auth-state'

function getFailureRedirect(origin: string, next: string, user: { is_anonymous?: boolean } | null) {
  if (user?.is_anonymous) {
    return `${origin}/upgrade?error=auth_failed`
  }

  const url = new URL('/continue', origin)
  url.searchParams.set('error', 'auth_failed')

  if (next !== '/dashboard') {
    url.searchParams.set('next', next)
  }

  return url.toString()
}

function isExistingIdentityConflict(error: { message?: string } | null | undefined) {
  return error?.message?.includes('Identity is already linked to another user') ?? false
}

function isExistingIdentityProviderConflict(searchParams: URLSearchParams) {
  return (
    searchParams.get('error_code') === EXISTING_GOOGLE_IDENTITY_ERROR_CODE
    || searchParams.get('error_description')?.includes('Identity is already linked to another user')
    || false
  )
}

function getDiscardGuestUserId(request: Request) {
  const cookieHeader = request.headers.get('cookie')

  if (!cookieHeader) {
    return null
  }

  for (const entry of cookieHeader.split(';')) {
    const trimmedEntry = entry.trim()

    if (trimmedEntry.startsWith(`${DISCARD_GUEST_COOKIE_NAME}=`)) {
      return decodeURIComponent(trimmedEntry.slice(DISCARD_GUEST_COOKIE_NAME.length + 1)) || null
    }
  }

  return null
}

function setDiscardGuestCookie(response: NextResponse, userId: string) {
  response.cookies.set(DISCARD_GUEST_COOKIE_NAME, userId, getDiscardGuestCookieOptions())
}

function clearDiscardGuestCookie(response: NextResponse) {
  response.cookies.set(DISCARD_GUEST_COOKIE_NAME, '', getExpiredDiscardGuestCookieOptions())
}

async function maybeDeleteDiscardedGuestUser(sourceUserId: string, currentUser: { id: string; is_anonymous?: boolean }) {
  if (!sourceUserId || currentUser.is_anonymous || currentUser.id === sourceUserId) {
    return
  }

  const admin = createAdminClient()
  const { data: sourceResult, error: sourceError } = await admin.auth.admin.getUserById(sourceUserId)

  if (sourceError) {
    console.error('failed to load discarded guest auth user', {
      message: sourceError.message,
      sourceUserId,
      targetUserId: currentUser.id,
    })
    return
  }

  if (!sourceResult.user?.is_anonymous) {
    return
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(sourceUserId)

  if (deleteError) {
    console.error('failed to delete discarded guest auth user', {
      message: deleteError.message,
      sourceUserId,
      targetUserId: currentUser.id,
    })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = sanitizeNextPath(searchParams.get('next'), '/dashboard')
  const upgradeMode = searchParams.get('upgrade_mode')
  const discardGuestUserId = getDiscardGuestUserId(request)

  const supabase = await createClient()
  let authSucceeded = false

  if (isExistingIdentityProviderConflict(searchParams)) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user?.is_anonymous) {
      const response = NextResponse.redirect(getExistingGoogleUpgradeRetryRedirect(origin))
      setDiscardGuestCookie(response, user.id)
      return response
    }
  }

  // PKCE flow for Google OAuth and identity linking.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      authSucceeded = true
    } else if (isExistingIdentityConflict(error)) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user?.is_anonymous) {
        const response = NextResponse.redirect(getExistingGoogleUpgradeRetryRedirect(origin))
        setDiscardGuestCookie(response, user.id)
        return response
      }
    }
  }

  if (!authSucceeded && tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    authSucceeded = !error
  }

  if (!authSucceeded) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const response = NextResponse.redirect(getFailureRedirect(origin, next, user))

    if (discardGuestUserId || upgradeMode === EXISTING_GOOGLE_UPGRADE_MODE) {
      clearDiscardGuestCookie(response)
    }

    return response
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const response = NextResponse.redirect(getFailureRedirect(origin, next, null))

    if (discardGuestUserId || upgradeMode === EXISTING_GOOGLE_UPGRADE_MODE) {
      clearDiscardGuestCookie(response)
    }

    return response
  }

  const response = NextResponse.redirect(`${origin}${next}`)

  if (discardGuestUserId) {
    if (upgradeMode === EXISTING_GOOGLE_UPGRADE_MODE) {
      await maybeDeleteDiscardedGuestUser(discardGuestUserId, user)
    }

    clearDiscardGuestCookie(response)
  }

  return response
}
