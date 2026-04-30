import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CompleteWorkoutButton } from './CompleteWorkoutButton'

const mocks = vi.hoisted(() => ({
  clearPendingCompletion: vi.fn(),
  completeWorkoutSession: vi.fn(),
  mutate: vi.fn(),
  queueWorkoutCompletion: vi.fn(),
  replace: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mocks.replace,
  }),
}))

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
}))

vi.mock('@/hooks/useWorkouts', () => ({
  useCompleteWorkout: () => ({
    isPending: false,
    mutate: mocks.mutate,
  }),
}))

vi.mock('@/hooks/useUser', () => ({
  useUser: () => ({
    data: { id: 'user-123' },
  }),
}))

vi.mock('@/store/workoutSessionStore', () => ({
  useWorkoutSessionStore: (
    selector: (state: {
      clearPendingCompletion: () => void
      completeWorkoutSession: (workoutId: number) => void
      pendingCompletionWorkoutId: number | null
      queueWorkoutCompletion: (workoutId: number) => void
    }) => unknown,
  ) =>
    selector({
      clearPendingCompletion: mocks.clearPendingCompletion,
      completeWorkoutSession: mocks.completeWorkoutSession,
      pendingCompletionWorkoutId: null,
      queueWorkoutCompletion: mocks.queueWorkoutCompletion,
    }),
}))

describe('CompleteWorkoutButton', () => {
  beforeEach(() => {
    mocks.clearPendingCompletion.mockReset()
    mocks.completeWorkoutSession.mockReset()
    mocks.mutate.mockReset()
    mocks.queueWorkoutCompletion.mockReset()
    mocks.replace.mockReset()
  })

  it('submits workout completion without a session note payload', async () => {
    const user = userEvent.setup()

    render(<CompleteWorkoutButton cycleId={9} workoutId={44} />)

    await user.click(screen.getByRole('button', { name: /complete workout/i }))

    expect(mocks.mutate).toHaveBeenCalledWith(
      {
        cycleId: 9,
        userId: 'user-123',
        workoutId: 44,
      },
      expect.objectContaining({
        onError: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
    )
  })

  it('keeps the active workout session when completion is queued offline', async () => {
    const user = userEvent.setup()
    const originalOnline = navigator.onLine

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    })

    render(<CompleteWorkoutButton cycleId={9} workoutId={44} />)

    await user.click(screen.getByRole('button', { name: /complete workout/i }))

    expect(mocks.queueWorkoutCompletion).toHaveBeenCalledWith(44)
    expect(mocks.completeWorkoutSession).not.toHaveBeenCalled()
    expect(mocks.replace).not.toHaveBeenCalled()

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: originalOnline,
    })
  })
})
