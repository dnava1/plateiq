import { NextResponse } from 'next/server'
import {
  getExpiredMergeIntentCookieOptions,
  getPendingGuestMergeStatus,
  MERGE_INTENT_COOKIE_NAME,
} from '@/lib/auth/merge'
import { createClient } from '@/lib/supabase/server'

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
}

export const runtime = 'nodejs'

function jsonResponse(body: Record<string, unknown>, status: number, clearMergeCookie = false) {
  const response = NextResponse.json(body, { status, headers: NO_STORE_HEADERS })

  if (clearMergeCookie) {
    response.cookies.set(MERGE_INTENT_COOKIE_NAME, '', getExpiredMergeIntentCookieOptions())
  }

  return response
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  try {
    const mergeStatus = await getPendingGuestMergeStatus(user)

    if (mergeStatus.status === 'pending') {
      return jsonResponse({ pending: true, canFinalize: mergeStatus.canFinalize }, 200)
    }

    return jsonResponse(
      { pending: false, canFinalize: false },
      200,
      mergeStatus.status === 'expired' || mergeStatus.status === 'invalid',
    )
  } catch (error) {
    console.error('guest merge status route failed', {
      message: error instanceof Error ? error.message : String(error),
      userId: user?.id ?? null,
    })

    return jsonResponse({ error: 'Unable to load guest merge status right now.' }, 500)
  }
}