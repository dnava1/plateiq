import { NextResponse } from 'next/server'
import { isAnonymousUser } from '@/lib/auth/auth-state'
import {
  finalizePendingGuestMerge,
  getExpiredMergeIntentCookieOptions,
  MERGE_INTENT_COOKIE_NAME,
} from '@/lib/auth/merge'
import { createClient } from '@/lib/supabase/server'

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
}

export const runtime = 'nodejs'

function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin')
  return Boolean(origin) && origin === new URL(request.url).origin
}

function jsonResponse(body: Record<string, unknown>, status: number, clearMergeCookie = false) {
  const response = NextResponse.json(body, { status, headers: NO_STORE_HEADERS })

  if (clearMergeCookie) {
    response.cookies.set(MERGE_INTENT_COOKIE_NAME, '', getExpiredMergeIntentCookieOptions())
  }

  return response
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  if (isAnonymousUser(user)) {
    return jsonResponse(
      { error: 'Guest sessions must sign in to an existing account before finalizing a merge.' },
      403,
    )
  }

  try {
    const mergeResult = await finalizePendingGuestMerge(user)

    if (mergeResult.status === 'merged') {
      return jsonResponse({ merged: true, summary: mergeResult.summary }, 200, true)
    }

    if (mergeResult.status === 'none') {
      return jsonResponse({ error: 'No guest merge is in progress.' }, 404, true)
    }

    if (mergeResult.status === 'expired' || mergeResult.status === 'invalid') {
      return jsonResponse(
        { error: 'The guest merge request is no longer valid. Start it again from the guest account.' },
        409,
        true,
      )
    }

    return jsonResponse(
      { error: 'Sign in to the account you selected for this merge before trying again.' },
      409,
    )
  } catch (error) {
    console.error('guest merge finalize route failed', {
      message: error instanceof Error ? error.message : String(error),
      userId: user.id,
    })

    return jsonResponse(
      { error: 'Unable to merge this guest session right now. Try again from settings.' },
      500,
    )
  }
}