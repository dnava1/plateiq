import { describe, expect, it, vi } from 'vitest'
import {
  assertHostedSeedAuthorization,
  assertSeedInvariants,
  ensureVerificationUser,
  resetUserData,
} from './seed-data.mjs'

const TEST_ENV = { NODE_ENV: 'test' } as NodeJS.ProcessEnv

function createAdminDeleteMock() {
  const deleteCalls: Array<{ table: string; column: string; value: string }> = []
  const from = vi.fn((table: string) => ({
    delete: () => ({
      eq: async (column: string, value: string) => {
        deleteCalls.push({ column, table, value })
        return { error: null }
      },
    }),
  }))

  return { admin: { from }, deleteCalls }
}

describe('assertHostedSeedAuthorization', () => {
  it('allows localhost targets without extra confirmation', () => {
    expect(assertHostedSeedAuthorization({
      args: [],
      env: TEST_ENV,
      supabaseUrl: 'http://localhost:54321',
      verificationEmail: 'copilot.verify@plateiq.local',
    })).toEqual({
      isHostedProject: false,
      projectRef: null,
    })
  })

  it('rejects hosted targets without positive authorization', () => {
    expect(() => assertHostedSeedAuthorization({
      args: [],
      env: TEST_ENV,
      supabaseUrl: 'https://demo-project.supabase.co',
      verificationEmail: 'copilot.verify@plateiq.local',
    })).toThrow(/--allow-hosted-dev/i)
  })

  it('requires a matching project ref and confirmation email for hosted targets', () => {
    expect(() => assertHostedSeedAuthorization({
      args: ['--allow-hosted-dev', '--project-ref', 'wrong-project', '--confirm-email', 'copilot.verify@plateiq.local'],
      env: TEST_ENV,
      supabaseUrl: 'https://demo-project.supabase.co',
      verificationEmail: 'copilot.verify@plateiq.local',
    })).toThrow(/project ref mismatch/i)

    expect(() => assertHostedSeedAuthorization({
      args: ['--allow-hosted-dev', '--project-ref', 'demo-project', '--confirm-email', 'someone-else@plateiq.local'],
      env: TEST_ENV,
      supabaseUrl: 'https://demo-project.supabase.co',
      verificationEmail: 'copilot.verify@plateiq.local',
    })).toThrow(/confirmation email mismatch/i)
  })

  it('allows hosted targets only when both confirmations match', () => {
    expect(assertHostedSeedAuthorization({
      args: ['--allow-hosted-dev', '--project-ref', 'demo-project', '--confirm-email', 'copilot.verify@plateiq.local'],
      env: TEST_ENV,
      supabaseUrl: 'https://demo-project.supabase.co',
      verificationEmail: 'copilot.verify@plateiq.local',
    })).toEqual({
      isHostedProject: true,
      projectRef: 'demo-project',
    })
  })
})

describe('ensureVerificationUser', () => {
  it('creates the verification user when the email does not exist yet', async () => {
    const listUsers = vi.fn().mockResolvedValue({ data: { users: [] }, error: null })
    const createUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const updateUserById = vi.fn()
    const admin = {
      auth: {
        admin: {
          createUser,
          listUsers,
          updateUserById,
        },
      },
    }

    const user = await ensureVerificationUser(admin as never, 'copilot.verify@plateiq.local', 'password-123')

    expect(user).toEqual({ id: 'user-1' })
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({
      email: 'copilot.verify@plateiq.local',
      email_confirm: true,
      password: 'password-123',
    }))
    expect(updateUserById).not.toHaveBeenCalled()
  })

  it('updates the verification user when the email already exists', async () => {
    const listUsers = vi.fn().mockResolvedValue({
      data: { users: [{ email: 'copilot.verify@plateiq.local', id: 'user-2' }] },
      error: null,
    })
    const createUser = vi.fn()
    const updateUserById = vi.fn().mockResolvedValue({ data: { user: { id: 'user-2' } }, error: null })
    const admin = {
      auth: {
        admin: {
          createUser,
          listUsers,
          updateUserById,
        },
      },
    }

    const user = await ensureVerificationUser(admin as never, 'copilot.verify@plateiq.local', 'password-123')

    expect(user).toEqual({ id: 'user-2' })
    expect(createUser).not.toHaveBeenCalled()
    expect(updateUserById).toHaveBeenCalledWith('user-2', expect.objectContaining({
      email: 'copilot.verify@plateiq.local',
      email_confirm: true,
      password: 'password-123',
    }))
  })
})

describe('resetUserData', () => {
  it('deletes only rows scoped to the target user', async () => {
    const { admin, deleteCalls } = createAdminDeleteMock()

    await resetUserData(admin as never, 'user-123')

    expect(deleteCalls).toEqual([
      { column: 'user_id', table: 'workout_sets', value: 'user-123' },
      { column: 'user_id', table: 'workouts', value: 'user-123' },
      { column: 'user_id', table: 'cycles', value: 'user-123' },
      { column: 'user_id', table: 'training_programs', value: 'user-123' },
      { column: 'user_id', table: 'training_maxes', value: 'user-123' },
      { column: 'created_by_user_id', table: 'exercises', value: 'user-123' },
    ])
  })
})

describe('assertSeedInvariants', () => {
  it('throws when the persisted counts do not match the expected fixture summary', () => {
    expect(() => assertSeedInvariants({
      completedWorkoutCount: 41,
      incompleteWorkoutCount: 1,
      totalCycles: 3,
      totalPrograms: 1,
      totalSets: 596,
      totalTrainingMaxes: 12,
      totalWorkouts: 42,
    }, {
      completedWorkoutCount: 42,
      incompleteWorkoutCount: 1,
      totalCycles: 3,
      totalSets: 596,
      totalTrainingMaxes: 12,
      totalWorkouts: 43,
    })).toThrow(/Seed invariant mismatch/i)
  })

  it('accepts matching persisted counts', () => {
    expect(() => assertSeedInvariants({
      completedWorkoutCount: 42,
      incompleteWorkoutCount: 1,
      totalCycles: 3,
      totalPrograms: 1,
      totalSets: 596,
      totalTrainingMaxes: 12,
      totalWorkouts: 43,
    }, {
      completedWorkoutCount: 42,
      incompleteWorkoutCount: 1,
      totalCycles: 3,
      totalSets: 596,
      totalTrainingMaxes: 12,
      totalWorkouts: 43,
    })).not.toThrow()
  })
})