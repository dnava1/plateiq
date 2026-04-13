import { NextResponse } from 'next/server'
import { isAnonymousUser } from '@/lib/auth/auth-state'
import {
  createMergeIntentToken,
  getMergeIntentCookieOptions,
  getMergeIntentExpiresAt,
  hashMergeIntentToken,
  MERGE_INTENT_COOKIE_NAME,
} from '@/lib/auth/merge'
import { createAdminClient, findAuthUserByEmail } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
}

const MAX_EMAIL_LENGTH = 320
const MERGE_PREPARE_RATE_LIMIT_MS = 15_000

export const runtime = 'nodejs'

function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin')
  return Boolean(origin) && origin === new URL(request.url).origin
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE_HEADERS })
  }

  const requestBody = await request.json().catch(() => null) as { targetEmail?: unknown } | null
  const targetEmail = typeof requestBody?.targetEmail === 'string'
    ? requestBody.targetEmail.trim().toLowerCase()
    : ''

  if (!targetEmail) {
    return NextResponse.json(
      { error: 'Enter the email address of the account you want to merge into.' },
      { status: 400, headers: NO_STORE_HEADERS },
    )
  }

  if (targetEmail.length > MAX_EMAIL_LENGTH) {
    return NextResponse.json(
      { error: 'Enter a valid email address of the account you want to merge into.' },
      { status: 400, headers: NO_STORE_HEADERS },
    )
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
      { error: 'Only guest accounts can start a merge.' },
      { status: 403, headers: NO_STORE_HEADERS },
    )
  }

  const { data: existingIntent, error: existingIntentError } = await supabase
    .from('account_merge_intents')
    .select('id, created_at')
    .eq('source_user_id', user.id)
    .is('consumed_at', null)
    .maybeSingle<{ id: number; created_at: string }>()

  if (existingIntentError) {
    console.error('failed to inspect pending guest merge intent', {
      message: existingIntentError.message,
      userId: user.id,
    })

    return NextResponse.json(
      { error: 'Unable to start an account merge right now.' },
      { status: 500, headers: NO_STORE_HEADERS },
    )
  }

  if (existingIntent) {
    const elapsedMs = Date.now() - new Date(existingIntent.created_at).getTime()

    if (elapsedMs < MERGE_PREPARE_RATE_LIMIT_MS) {
      return NextResponse.json(
        { error: 'Wait a few seconds before trying another account merge.' },
        { status: 429, headers: NO_STORE_HEADERS },
      )
    }
  }

  let targetUserId = user.id

  try {
    const admin = createAdminClient()
    const targetUser = await findAuthUserByEmail(admin, targetEmail)

    if (targetUser && !isAnonymousUser(targetUser)) {
      targetUserId = targetUser.id
    }
  } catch (error) {
    console.error('failed to resolve merge target account', {
      message: error instanceof Error ? error.message : String(error),
      userId: user.id,
    })

    return NextResponse.json(
      { error: 'Unable to start an account merge right now.' },
      { status: 500, headers: NO_STORE_HEADERS },
    )
  }

  const { error: deleteError } = await supabase
    .from('account_merge_intents')
    .delete()
    .eq('source_user_id', user.id)

  if (deleteError) {
    console.error('failed to clear existing guest merge intents', {
      message: deleteError.message,
      userId: user.id,
    })

    return NextResponse.json(
      { error: 'Unable to start an account merge right now.' },
      { status: 500, headers: NO_STORE_HEADERS },
    )
  }

  const mergeToken = createMergeIntentToken()
  const expiresAt = getMergeIntentExpiresAt()
  const { error: insertError } = await supabase.from('account_merge_intents').insert({
    source_user_id: user.id,
    target_user_id: targetUserId,
    token_hash: hashMergeIntentToken(mergeToken),
    expires_at: expiresAt,
  })

  if (insertError) {
    console.error('failed to create guest merge intent', {
      message: insertError.message,
      userId: user.id,
    })

    return NextResponse.json(
      { error: 'Unable to start an account merge right now.' },
      { status: 500, headers: NO_STORE_HEADERS },
    )
  }

  const response = NextResponse.json({ prepared: true, expiresAt }, { status: 200, headers: NO_STORE_HEADERS })
  response.cookies.set(MERGE_INTENT_COOKIE_NAME, mergeToken, getMergeIntentCookieOptions())
  return response
}