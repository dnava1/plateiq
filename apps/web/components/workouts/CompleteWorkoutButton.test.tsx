import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CompleteWorkoutButton } from './CompleteWorkoutButton'

const mocks = vi.hoisted(() => ({
  completeWorkoutSession: vi.fn(),
  mutate: vi.fn(),
  replace: vi.fn(),
  workoutNoteDrafts: {
    44: 'Load change: dropped 10 lbs after the top set',
  } as Record<number, string>,
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
      completeWorkoutSession: (workoutId: number, options?: { preserveDraft?: boolean }) => void
      workoutNoteDrafts: Record<number, string>
    }) => unknown,
  ) =>
    selector({
      completeWorkoutSession: mocks.completeWorkoutSession,
      workoutNoteDrafts: mocks.workoutNoteDrafts,
    }),
}))

describe('CompleteWorkoutButton', () => {
  beforeEach(() => {
    mocks.completeWorkoutSession.mockReset()
    mocks.mutate.mockReset()
    mocks.replace.mockReset()
    mocks.workoutNoteDrafts = {
      44: 'Load change: dropped 10 lbs after the top set',
    }
  })

  it('submits the persisted workout note draft with workout completion', async () => {
    const user = userEvent.setup()

    render(<CompleteWorkoutButton cycleId={9} workoutId={44} />)

    await user.click(screen.getByRole('button', { name: /complete workout/i }))

    expect(mocks.mutate).toHaveBeenCalledWith(
      {
        cycleId: 9,
        notes: 'Load change: dropped 10 lbs after the top set',
        workoutId: 44,
      },
      expect.objectContaining({
        onError: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
    )
  })

  it('keeps the workout note draft recoverable when completion is queued offline', async () => {
    const user = userEvent.setup()
    const originalOnline = navigator.onLine

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    })

    render(<CompleteWorkoutButton cycleId={9} workoutId={44} />)

    await user.click(screen.getByRole('button', { name: /complete workout/i }))

    expect(mocks.completeWorkoutSession).toHaveBeenCalledWith(44, { preserveDraft: true })
    expect(mocks.replace).toHaveBeenCalledWith('/workouts')

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: originalOnline,
    })
  })
})