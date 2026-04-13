import { createHash, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'
import { isAnonymousUser } from '@/lib/auth/auth-state'
import { createAdminClient, type AdminClient } from '@/lib/supabase/admin'

export const MERGE_INTENT_COOKIE_NAME = 'plateiq-merge-intent'

const MERGE_INTENT_TTL_SECONDS = 30 * 60

type MergeIntentRow = {
  id: number
  source_user_id: string
  target_user_id: string
  expires_at: string
  consumed_at: string | null
}

type MergeIntentLookup =
  | { status: 'none' }
  | { status: 'expired' }
  | { status: 'invalid' }
  | { status: 'pending'; intent: MergeIntentRow }

export type PendingGuestMergeStatus =
  | { status: 'none' }
  | { status: 'expired' }
  | { status: 'invalid' }
  | { status: 'pending'; canFinalize: boolean }

export type FinalizeGuestMergeResult =
  | { status: 'none' }
  | { status: 'expired' }
  | { status: 'invalid' }
  | { status: 'invalid_target' }
  | { status: 'merged'; summary: unknown }

export function createMergeIntentToken() {
  return randomBytes(32).toString('hex')
}

export function hashMergeIntentToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function getMergeIntentExpiresAt() {
  return new Date(Date.now() + MERGE_INTENT_TTL_SECONDS * 1000).toISOString()
}

export function getMergeIntentCookieOptions() {
  return {
    httpOnly: true,
    maxAge: MERGE_INTENT_TTL_SECONDS,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  }
}

export function getExpiredMergeIntentCookieOptions() {
  return {
    ...getMergeIntentCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  }
}

async function deleteMergeIntent(admin: AdminClient, intentId: number) {
  const { error } = await admin
    .from('account_merge_intents')
    .delete()
    .eq('id', intentId)

  if (error) {
    throw error
  }
}

async function readPendingGuestMergeIntent(admin: AdminClient): Promise<MergeIntentLookup> {
  const cookieStore = await cookies()
  const token = cookieStore.get(MERGE_INTENT_COOKIE_NAME)?.value

  if (!token) {
    return { status: 'none' }
  }

  const tokenHash = hashMergeIntentToken(token)
  const { data: intent, error: intentError } = await admin
    .from('account_merge_intents')
    .select('id, source_user_id, target_user_id, expires_at, consumed_at')
    .eq('token_hash', tokenHash)
    .maybeSingle<MergeIntentRow>()

  if (intentError) {
    throw intentError
  }

  if (!intent) {
    return { status: 'invalid' }
  }

  if (intent.consumed_at || new Date(intent.expires_at).getTime() <= Date.now()) {
    await deleteMergeIntent(admin, intent.id)
    return { status: 'expired' }
  }

  return {
    status: 'pending',
    intent,
  }
}

export async function getPendingGuestMergeStatus(
  currentUser: Pick<User, 'id' | 'is_anonymous'> | null | undefined,
): Promise<PendingGuestMergeStatus> {
  const admin = createAdminClient()
  const mergeIntent = await readPendingGuestMergeIntent(admin)

  if (mergeIntent.status !== 'pending') {
    return mergeIntent
  }

  return {
    status: 'pending',
    canFinalize: Boolean(currentUser && !currentUser.is_anonymous && currentUser.id === mergeIntent.intent.target_user_id),
  }
}

export async function cancelPendingGuestMerge() {
  const admin = createAdminClient()
  const mergeIntent = await readPendingGuestMergeIntent(admin)

  if (mergeIntent.status !== 'pending') {
    return false
  }

  await deleteMergeIntent(admin, mergeIntent.intent.id)
  return true
}

export async function finalizePendingGuestMerge(targetUser: User): Promise<FinalizeGuestMergeResult> {
  const admin = createAdminClient()
  const mergeIntent = await readPendingGuestMergeIntent(admin)

  if (mergeIntent.status !== 'pending') {
    return mergeIntent
  }

  if (targetUser.is_anonymous) {
    return { status: 'invalid' }
  }

  if (mergeIntent.intent.target_user_id !== targetUser.id) {
    return { status: 'invalid_target' }
  }

  const { data: sourceResult, error: sourceError } = await admin.auth.admin.getUserById(mergeIntent.intent.source_user_id)

  if (sourceError) {
    throw sourceError
  }

  const sourceUser = sourceResult.user

  if (!sourceUser || !isAnonymousUser(sourceUser) || sourceUser.id === targetUser.id) {
    await deleteMergeIntent(admin, mergeIntent.intent.id)
    return { status: 'invalid' }
  }

  const { data: summary, error: mergeError } = await admin.rpc('merge_guest_account', {
    p_source_user_id: sourceUser.id,
    p_target_user_id: targetUser.id,
  })

  if (mergeError) {
    throw mergeError
  }

  try {
    await deleteMergeIntent(admin, mergeIntent.intent.id)
  } catch (deleteIntentError) {
    console.error('failed to delete consumed guest merge intent', {
      intentId: mergeIntent.intent.id,
      message: deleteIntentError instanceof Error ? deleteIntentError.message : String(deleteIntentError),
      sourceUserId: sourceUser.id,
      targetUserId: targetUser.id,
    })
  }

  const { error: deleteSourceError } = await admin.auth.admin.deleteUser(sourceUser.id)

  if (deleteSourceError) {
    console.error('failed to delete merged guest auth user', {
      message: deleteSourceError.message,
      sourceUserId: sourceUser.id,
      targetUserId: targetUser.id,
    })
  }

  return {
    status: 'merged',
    summary,
  }
}