import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WorkoutsPage from './page'

const mocks = vi.hoisted(() => ({
  clearSession: vi.fn(),
  useActiveProgram: vi.fn(),
}))

vi.mock('@/hooks/usePrograms', () => ({
  useActiveProgram: () => mocks.useActiveProgram(),
}))

vi.mock('@/store/workoutSessionStore', () => ({
  useWorkoutSessionStore: (selector: (state: { activeWorkoutId: number | null; clearSession: typeof mocks.clearSession }) => unknown) => selector({
    activeWorkoutId: null,
    clearSession: mocks.clearSession,
  }),
}))

vi.mock('@/components/workouts/WorkoutLauncher', () => ({
  WorkoutLauncher: () => <div>workout-launcher</div>,
}))

vi.mock('@/components/workouts/ActiveWorkoutPanel', () => ({
  ActiveWorkoutPanel: () => <div>active-workout-panel</div>,
}))

function createProgram(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    user_id: 'user-1',
    name: 'Test Program',
    template_key: 'wendler_531',
    config: null,
    is_active: true,
    start_date: '2026-04-01',
    created_at: null,
    updated_at: null,
    ...overrides,
  }
}

describe('WorkoutsPage', () => {
  beforeEach(() => {
    mocks.clearSession.mockClear()
  })

  it('keeps workouts focused on the launcher flow even for TM-backed programs', () => {
    mocks.useActiveProgram.mockReturnValue({
      data: createProgram({ template_key: 'wendler_531' }),
      isLoading: false,
    })

    render(<WorkoutsPage />)

    expect(screen.getByText('workout-launcher')).toBeInTheDocument()
    expect(screen.queryByText('Workout TM Quick Access')).not.toBeInTheDocument()
  })

  it('shows the empty state when no active program exists', () => {
    mocks.useActiveProgram.mockReturnValue({
      data: null,
      isLoading: false,
    })

    render(<WorkoutsPage />)

    expect(screen.getByText('No active program')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start a Program' })).toBeInTheDocument()
  })
})