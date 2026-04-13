import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveRepoPath } from '@/test/resolveRepoPath'
import { cancelPendingGuestMerge, finalizePendingGuestMerge, getPendingGuestMergeStatus } from './merge'

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  createAdminClient: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: mocks.cookies,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}))

function createAdminClientMock({
  intent,
  sourceUser,
}: {
  intent: {
    id: number
    source_user_id: string
    target_user_id: string
    expires_at: string
    consumed_at: string | null
  } | null
  sourceUser?: { id: string; is_anonymous: boolean } | null
}) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: intent, error: null })
  const eqAfterSelect = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq: eqAfterSelect }))
  const eqAfterDelete = vi.fn().mockResolvedValue({ error: null })
  const deleteFn = vi.fn(() => ({ eq: eqAfterDelete }))
  const from = vi.fn(() => ({ select, delete: deleteFn }))
  const getUserById = vi.fn().mockResolvedValue({ data: { user: sourceUser ?? null }, error: null })
  const rpc = vi.fn().mockResolvedValue({ data: { merged: true }, error: null })
  const deleteUser = vi.fn().mockResolvedValue({ error: null })

  return {
    from,
    auth: {
      admin: {
        getUserById,
        deleteUser,
      },
    },
    rpc,
    select,
    eqAfterSelect,
    deleteFn,
    eqAfterDelete,
    getUserById,
    deleteUser,
  }
}

describe('guest merge helpers', () => {
  beforeEach(() => {
    mocks.cookies.mockReset()
    mocks.createAdminClient.mockReset()
  })

  it('reports a pending merge as resumable only for the bound target account', async () => {
    mocks.cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'merge-token' }),
    })
    const admin = createAdminClientMock({
      intent: {
        id: 1,
        source_user_id: 'guest-user',
        target_user_id: 'permanent-user',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        consumed_at: null,
      },
    })
    mocks.createAdminClient.mockReturnValue(admin)

    await expect(getPendingGuestMergeStatus({ id: 'permanent-user', is_anonymous: false } as never)).resolves.toEqual({
      status: 'pending',
      canFinalize: true,
    })
    await expect(getPendingGuestMergeStatus({ id: 'guest-user', is_anonymous: true } as never)).resolves.toEqual({
      status: 'pending',
      canFinalize: false,
    })
    await expect(getPendingGuestMergeStatus({ id: 'other-user', is_anonymous: false } as never)).resolves.toEqual({
      status: 'pending',
      canFinalize: false,
    })
  })

  it('refuses to finalize a merge into the wrong permanent account without consuming the intent', async () => {
    mocks.cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'merge-token' }),
    })
    const admin = createAdminClientMock({
      intent: {
        id: 7,
        source_user_id: 'guest-user',
        target_user_id: 'expected-user',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        consumed_at: null,
      },
    })
    mocks.createAdminClient.mockReturnValue(admin)

    await expect(finalizePendingGuestMerge({ id: 'wrong-user', is_anonymous: false } as never)).resolves.toEqual({
      status: 'invalid_target',
    })
    expect(admin.rpc).not.toHaveBeenCalled()
    expect(admin.deleteFn).not.toHaveBeenCalled()
  })

  it('finalizes a valid guest merge and deletes the consumed intent and source auth user', async () => {
    mocks.cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'merge-token' }),
    })
    const admin = createAdminClientMock({
      intent: {
        id: 11,
        source_user_id: 'guest-user',
        target_user_id: 'permanent-user',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        consumed_at: null,
      },
      sourceUser: {
        id: 'guest-user',
        is_anonymous: true,
      },
    })
    mocks.createAdminClient.mockReturnValue(admin)

    await expect(finalizePendingGuestMerge({ id: 'permanent-user', is_anonymous: false } as never)).resolves.toEqual({
      status: 'merged',
      summary: { merged: true },
    })

    expect(admin.rpc).toHaveBeenCalledWith('merge_guest_account', {
      p_source_user_id: 'guest-user',
      p_target_user_id: 'permanent-user',
    })
    expect(admin.deleteFn).toHaveBeenCalledTimes(1)
    expect(admin.eqAfterDelete).toHaveBeenCalledWith('id', 11)
    expect(admin.deleteUser).toHaveBeenCalledWith('guest-user')
  })

  it('cancels a pending merge by deleting the stored intent row', async () => {
    mocks.cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'merge-token' }),
    })
    const admin = createAdminClientMock({
      intent: {
        id: 9,
        source_user_id: 'guest-user',
        target_user_id: 'permanent-user',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        consumed_at: null,
      },
    })
    mocks.createAdminClient.mockReturnValue(admin)

    await expect(cancelPendingGuestMerge()).resolves.toBe(true)
    expect(admin.deleteFn).toHaveBeenCalledTimes(1)
    expect(admin.eqAfterDelete).toHaveBeenCalledWith('id', 9)
  })

  it('keeps the merge SQL regression for strength profile fields in place', () => {
    const migrationSql = readFileSync(resolveRepoPath('supabase/migrations/20260413121500_strength_profile_review_hardening.sql'), 'utf8')

    expect(migrationSql).toContain('strength_profile_sex = COALESCE(public.profiles.strength_profile_sex, v_source_profile.strength_profile_sex)')
    expect(migrationSql).toContain('strength_profile_age_years = COALESCE(public.profiles.strength_profile_age_years, v_source_profile.strength_profile_age_years)')
    expect(migrationSql).toContain('strength_profile_bodyweight_lbs = COALESCE(public.profiles.strength_profile_bodyweight_lbs, v_source_profile.strength_profile_bodyweight_lbs)')
  })
})