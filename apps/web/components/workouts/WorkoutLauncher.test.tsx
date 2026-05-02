import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkoutLauncher } from './WorkoutLauncher'

const mocks = vi.hoisted(() => ({
  ensureWorkout: {
    isPending: false,
    mutate: vi.fn(),
  },
  generateWorkoutPlan: vi.fn(),
  resolveWorkoutProgram: vi.fn(),
  setActiveContext: vi.fn(),
  setActiveWorkout: vi.fn(),
  useActiveCycle: vi.fn(),
  useCycleWorkouts: vi.fn(),
  useExercises: vi.fn(),
  workoutSessionState: {
    activeCycleId: null,
    activeDayIndex: null,
    activeWeekNumber: null,
    setActiveContext: vi.fn(),
    setActiveWorkout: vi.fn(),
  },
}))

vi.mock('@/hooks/usePreferredWeightRounding', () => ({
  usePreferredWeightRounding: () => 5,
}))

vi.mock('@/hooks/useExercises', () => ({
  resolveExerciseIdFromMap: () => null,
  useExerciseKeyMap: () => new Map(),
  useExercises: () => mocks.useExercises(),
}))

vi.mock('@/hooks/useTrainingMaxes', () => ({
  useCurrentTrainingMaxes: () => ({ data: [] }),
}))

vi.mock('@/hooks/useUser', () => ({
  useUser: () => ({ data: { id: 'user-1' } }),
}))

vi.mock('@/hooks/useWorkouts', () => ({
  buildTrainingMaxMap: () => new Map(),
  resolveWorkoutProgram: (...args: unknown[]) => mocks.resolveWorkoutProgram(...args),
  useActiveCycle: (...args: unknown[]) => mocks.useActiveCycle(...args),
  useCycleWorkouts: (...args: unknown[]) => mocks.useCycleWorkouts(...args),
  useEnsureWorkout: () => mocks.ensureWorkout,
}))

vi.mock('@/lib/constants/templates/engine', () => ({
  generateWorkoutPlan: (...args: unknown[]) => mocks.generateWorkoutPlan(...args),
}))

vi.mock('@/store/workoutSessionStore', () => ({
  useWorkoutSessionStore: (
    selector: (state: typeof mocks.workoutSessionState) => unknown,
  ) => selector(mocks.workoutSessionState),
}))

vi.mock('./WorkoutPlanDisplay', () => ({
  WorkoutPlanDisplay: ({ sets }: { sets: Array<{ exerciseName: string; reps_prescribed: number }> }) => (
    <div>{sets.map((set) => `${set.exerciseName}:${set.reps_prescribed}`).join(', ')}</div>
  ),
}))

describe('WorkoutLauncher', () => {
  beforeEach(() => {
    mocks.ensureWorkout.mutate.mockReset()
    mocks.generateWorkoutPlan.mockReset()
    mocks.resolveWorkoutProgram.mockReset()
    mocks.setActiveContext.mockReset()
    mocks.setActiveWorkout.mockReset()
    mocks.useActiveCycle.mockReset()
    mocks.useCycleWorkouts.mockReset()
    mocks.useExercises.mockReset()
    mocks.workoutSessionState = {
      activeCycleId: null,
      activeDayIndex: null,
      activeWeekNumber: null,
      setActiveContext: mocks.setActiveContext,
      setActiveWorkout: mocks.setActiveWorkout,
    }

    mocks.resolveWorkoutProgram.mockReturnValue({
      rounding: 5,
      selectedVariationKeys: [],
      template: {
        cycle_length_weeks: 2,
        days: [{ label: 'Week 1 OHP Only', exercise_blocks: [{ role: 'primary', exercise_key: 'ohp', sets: [] }] }],
        week_schemes: {
          '2': {
            label: 'Week 2',
            days: [{ label: 'Week 2 Bench Only', exercise_blocks: [{ role: 'primary', exercise_key: 'bench', sets: [] }] }],
          },
        },
      },
    })
    mocks.useActiveCycle.mockReturnValue({ data: { cycle_number: 2, id: 44 }, isLoading: false })
    mocks.useCycleWorkouts.mockReturnValue({ data: [] })
    mocks.useExercises.mockReturnValue({
      data: [
        { id: 1, name: 'Overhead Press' },
        { id: 2, name: 'Bench Press' },
      ],
      isLoading: false,
    })
    mocks.generateWorkoutPlan.mockImplementation((template, dayIndex, weekNumber) => [{
      block_id: `week-${String(weekNumber)}-${String(dayIndex)}`,
      block_order: 1,
      block_role: 'primary',
      exercise_id: weekNumber === 1 ? 1 : 2,
      exercise_key: weekNumber === 1 ? 'ohp' : 'bench',
      intensity_type: 'percentage_tm',
      is_amrap: false,
      reps_prescribed: weekNumber === 1 ? 5 : 3,
      reps_prescribed_max: undefined,
      rest_seconds: 60,
      set_order: 1,
      set_type: 'main',
      weight_lbs: 100,
    }])
  })

  it('renders week-specific day options when the selected week changes', async () => {
    const user = userEvent.setup()

    render(
      <WorkoutLauncher
        program={{
          config: null,
          id: 1,
          name: 'Alternating Upper',
          template_key: 'custom',
        } as never}
      />,
    )

    expect(screen.getByRole('button', { name: /Week 1 OHP Only/i })).toBeInTheDocument()
    expect(screen.getByText('Overhead Press:5')).toBeInTheDocument()

    const buttons = screen.getAllByRole('button')
    await user.click(buttons[1]!)

    expect(screen.getByRole('button', { name: /Week 2 Bench Only/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Week 1 OHP Only/i })).not.toBeInTheDocument()
    expect(screen.getByText('Bench Press:3')).toBeInTheDocument()
  })

  it('trusts explicit exercise ids while the exercise catalog is still loading', async () => {
    const user = userEvent.setup()

    mocks.useExercises.mockReturnValue({
      data: undefined,
      isLoading: true,
    })
    mocks.resolveWorkoutProgram.mockReturnValue({
      rounding: 5,
      selectedVariationKeys: [],
      template: {
        cycle_length_weeks: 1,
        days: [{ label: 'Week 1 OHP Only', exercise_blocks: [{ role: 'primary', exercise_id: 1, exercise_key: 'ohp', sets: [] }] }],
      },
    })

    render(
      <WorkoutLauncher
        program={{
          config: null,
          id: 1,
          name: 'Alternating Upper',
          template_key: 'custom',
        } as never}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Start' }))

    expect(mocks.ensureWorkout.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        cycleId: 44,
        dayLabel: 'Week 1 OHP Only',
        primaryExerciseId: 1,
        userId: 'user-1',
        weekNumber: 1,
      }),
      expect.any(Object),
    )
  })
})
