import { NextResponse } from 'next/server'
import { isAnonymousUser } from '@/lib/auth/auth-state'
import {
  DISCARD_GUEST_COOKIE_NAME,
  getDiscardGuestCookieOptions,
  getExpiredDiscardGuestCookieOptions,
} from '@/lib/auth/google-upgrade'
import { createClient } from '@/lib/supabase/server'

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
}

export const runtime = 'nodejs'

function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin')
  return Boolean(origin) && origin === new URL(request.url).origin
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE_HEADERS })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS })
  }

  if (!isAnonymousUser(user)) {
    return NextResponse.json(
      { error: 'Only guest accounts can prepare an existing-account sign-in.' },
      { status: 403, headers: NO_STORE_HEADERS },
    )
  }

  const response = NextResponse.json({ prepared: true }, { status: 200, headers: NO_STORE_HEADERS })
  response.cookies.set(DISCARD_GUEST_COOKIE_NAME, user.id, getDiscardGuestCookieOptions())
  return response
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE_HEADERS })
  }

  const response = new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS })
  response.cookies.set(DISCARD_GUEST_COOKIE_NAME, '', getExpiredDiscardGuestCookieOptions())
  return response
}