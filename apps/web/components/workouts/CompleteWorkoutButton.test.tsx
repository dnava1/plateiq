import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CompleteWorkoutButton } from './CompleteWorkoutButton'

const mocks = vi.hoisted(() => ({
  completeWorkoutSession: vi.fn(),
  mutate: vi.fn(),
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

vi.mock('@/store/workoutSessionStore', () => ({
  useWorkoutSessionStore: (
    selector: (state: {
      completeWorkoutSession: (workoutId: number) => void
    }) => unknown,
  ) =>
    selector({
      completeWorkoutSession: mocks.completeWorkoutSession,
    }),
}))

describe('CompleteWorkoutButton', () => {
  beforeEach(() => {
    mocks.completeWorkoutSession.mockReset()
    mocks.mutate.mockReset()
    mocks.replace.mockReset()
  })

  it('submits workout completion without a session note payload', async () => {
    const user = userEvent.setup()

    render(<CompleteWorkoutButton cycleId={9} workoutId={44} />)

    await user.click(screen.getByRole('button', { name: /complete workout/i }))

    expect(mocks.mutate).toHaveBeenCalledWith(
      {
        cycleId: 9,
        workoutId: 44,
      },
      expect.objectContaining({
        onError: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
    )
  })

  it('clears the active workout session when completion is queued offline', async () => {
    const user = userEvent.setup()
    const originalOnline = navigator.onLine

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    })

    render(<CompleteWorkoutButton cycleId={9} workoutId={44} />)

    await user.click(screen.getByRole('button', { name: /complete workout/i }))

    expect(mocks.completeWorkoutSession).toHaveBeenCalledWith(44)
    expect(mocks.replace).toHaveBeenCalledWith('/workouts')

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: originalOnline,
    })
  })
})
