import { NextResponse } from 'next/server'
import {
  cancelPendingGuestMerge,
  getExpiredMergeIntentCookieOptions,
  MERGE_INTENT_COOKIE_NAME,
} from '@/lib/auth/merge'

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

  try {
    await cancelPendingGuestMerge()
    return jsonResponse({ cancelled: true }, 200, true)
  } catch (error) {
    console.error('guest merge cancel route failed', {
      message: error instanceof Error ? error.message : String(error),
    })

    return jsonResponse({ error: 'Unable to cancel the pending guest merge right now.' }, 500)
  }
}