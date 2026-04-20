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

vi.mock('@/components/exercises/TrainingMaxPanel', () => ({
  TrainingMaxPanel: ({ title }: { title: string }) => <div>{title}</div>,
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

  it('shows workout TM quick access for TM-driven templates', () => {
    mocks.useActiveProgram.mockReturnValue({
      data: createProgram({ template_key: 'wendler_531' }),
      isLoading: false,
    })

    render(<WorkoutsPage />)

    expect(screen.getByText('Workout TM Quick Access')).toBeInTheDocument()
  })

  it('shows workout TM quick access for built-in templates with TM-backed prescriptions', () => {
    mocks.useActiveProgram.mockReturnValue({
      data: createProgram({ template_key: 'texas_method' }),
      isLoading: false,
    })

    render(<WorkoutsPage />)

    expect(screen.getByText('Workout TM Quick Access')).toBeInTheDocument()
  })

  it('hides workout TM quick access for non-TM templates', () => {
    mocks.useActiveProgram.mockReturnValue({
      data: createProgram({ template_key: 'starting_strength' }),
      isLoading: false,
    })

    render(<WorkoutsPage />)

    expect(screen.queryByText('Workout TM Quick Access')).not.toBeInTheDocument()
  })

  it('shows workout TM quick access when a custom program overrides the template method', () => {
    mocks.useActiveProgram.mockReturnValue({
      data: createProgram({
        template_key: 'starting_strength',
        config: {
          type: 'custom',
          level: 'intermediate',
          days_per_week: 3,
          cycle_length_weeks: 4,
          uses_training_max: true,
          tm_percentage: 0.9,
          days: [],
          progression: {
            style: 'linear_per_cycle',
            increment_lbs: { upper: 5, lower: 10 },
          },
        },
      }),
      isLoading: false,
    })

    render(<WorkoutsPage />)

    expect(screen.getByText('Workout TM Quick Access')).toBeInTheDocument()
  })

  it('keeps workout TM quick access visible when a general custom program still contains TM-backed prescriptions', () => {
    mocks.useActiveProgram.mockReturnValue({
      data: createProgram({
        template_key: 'custom',
        config: {
          type: 'custom',
          level: 'intermediate',
          days_per_week: 1,
          cycle_length_weeks: 4,
          uses_training_max: false,
          tm_percentage: 0.9,
          days: [
            {
              label: 'Day 1',
              exercise_blocks: [
                {
                  role: 'primary',
                  exercise_key: 'squat',
                  sets: [{ sets: 3, reps: 5, intensity: 0.75, intensity_type: 'percentage_tm' }],
                },
              ],
            },
          ],
          progression: {
            style: 'linear_per_cycle',
            increment_lbs: { upper: 5, lower: 10 },
          },
        },
      }),
      isLoading: false,
    })

    render(<WorkoutsPage />)

    expect(screen.getByText('Workout TM Quick Access')).toBeInTheDocument()
  })
})