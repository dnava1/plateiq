import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useUiStore } from '@/store/uiStore'
import { useBuilderDraftStore } from '@/store/builderDraftStore'
import { ReviewStep } from './ReviewStep'

const mocks = vi.hoisted(() => ({
  useExercises: vi.fn(),
  useCurrentTrainingMaxes: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('@/hooks/usePrograms', () => ({
  useCreateProgramDefinition: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
  useUpdateProgramDefinition: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
  useCreateProgramRevision: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
}))

vi.mock('@/hooks/useExercises', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useExercises')>('@/hooks/useExercises')
  return {
    ...actual,
    useExercises: () => mocks.useExercises(),
  }
})

vi.mock('@/hooks/useTrainingMaxes', () => ({
  useCurrentTrainingMaxes: () => mocks.useCurrentTrainingMaxes(),
}))

vi.mock('@/components/exercises/TrainingMaxPanel', () => ({
  TrainingMaxPanel: ({ title }: { title: string }) => <div>{title}</div>,
}))

describe('ReviewStep', () => {
  beforeEach(() => {
    localStorage.clear()
    useUiStore.setState({ preferredUnit: 'lbs' })
    useBuilderDraftStore.getState().resetDraft()

    const draft = useBuilderDraftStore.getState().draft

    useBuilderDraftStore.setState({
      draft: {
        ...draft,
        name: 'Wave Builder',
        progression: {
          style: 'wave',
          deload_trigger: 'Two stalled weeks',
          deload_strategy: 'Reduce volume by 50% for one week',
        },
      },
    })

    mocks.useExercises.mockReturnValue({
      data: [
        {
          id: 1,
          name: 'Squat',
          category: 'main',
          movement_pattern: 'squat',
          is_main_lift: true,
          strength_lift_slug: 'back_squat',
          created_at: null,
          created_by_user_id: null,
        },
        {
          id: 2,
          name: 'Bench Press',
          category: 'main',
          movement_pattern: 'push',
          is_main_lift: true,
          strength_lift_slug: 'bench_press',
          created_at: null,
          created_by_user_id: null,
        },
        {
          id: 3,
          name: 'Overhead Press',
          category: 'main',
          movement_pattern: 'vertical_push',
          is_main_lift: true,
          strength_lift_slug: 'overhead_press',
          created_at: null,
          created_by_user_id: null,
        },
      ],
      isLoading: false,
    })
    mocks.useCurrentTrainingMaxes.mockReturnValue({
      data: [],
      isLoading: false,
    })
  })

  it('shows non-linear progression details in the review summary', () => {
    const draft = useBuilderDraftStore.getState().draft

    useBuilderDraftStore.setState({
      draft: {
        ...draft,
        days: [
          {
            label: 'Day 1',
            exercise_blocks: [
              {
                role: 'primary',
                exercise_id: 1,
                exercise_key: 'Squat',
                sets: [{ sets: 3, reps: 5, intensity: 0.75, intensity_type: 'percentage_tm', rest_seconds: 120 }],
              },
            ],
          },
        ],
      },
    })

    render(<ReviewStep />)

    expect(screen.getByText('Progression')).toBeInTheDocument()
    expect(screen.getByText('Style: Wave')).toBeInTheDocument()
    expect(screen.getByText('3x5 at 75% TM - rest 2:00')).toBeInTheDocument()
    expect(screen.getByText('Deload decisions stay manual and happen during the current cycle checkpoint.')).toBeInTheDocument()
    expect(screen.queryByText('Deload trigger: Two stalled weeks')).not.toBeInTheDocument()
    expect(screen.queryByText('Deload strategy: Reduce volume by 50% for one week')).not.toBeInTheDocument()
  })

  it('shows warm-up and drop-set descriptors in the review summary', () => {
    const draft = useBuilderDraftStore.getState().draft

    useBuilderDraftStore.setState({
      draft: {
        ...draft,
        days: [
          {
            label: 'Day 1',
            exercise_blocks: [
              {
                role: 'primary',
                exercise_id: 1,
                exercise_key: 'Squat',
                sets: [
                  { sets: 1, reps: 5, intensity: 95, intensity_type: 'fixed_weight', purpose: 'warmup' },
                  { sets: 1, reps: 12, intensity: 0.7, intensity_type: 'percentage_work_set', display_type: 'drop' },
                ],
              },
            ],
          },
        ],
      },
    })

    render(<ReviewStep />)

    expect(screen.getByText('1x5 at 95 lbs - warm-up')).toBeInTheDocument()
    expect(screen.getByText('1x12 at 70% first work set - drop set')).toBeInTheDocument()
  })

  it('shows AMRAP sets clearly in the review summary', () => {
    const draft = useBuilderDraftStore.getState().draft

    useBuilderDraftStore.setState({
      draft: {
        ...draft,
        days: [
          {
            label: 'Day 1',
            exercise_blocks: [
              {
                role: 'primary',
                exercise_id: 1,
                exercise_key: 'Squat',
                sets: [{ sets: 1, reps: 5, intensity: 0.85, intensity_type: 'percentage_tm', is_amrap: true }],
              },
            ],
          },
        ],
      },
    })

    render(<ReviewStep />)

    expect(screen.getByText('1x5+ at 85% TM - AMRAP')).toBeInTheDocument()
  })

  it('resolves template shorthand exercise keys to seeded exercise names in the review step', () => {
    const draft = useBuilderDraftStore.getState().draft

    useBuilderDraftStore.setState({
      draft: {
        ...draft,
        days: [
          {
            label: 'Press Day',
            exercise_blocks: [
              {
                role: 'primary',
                exercise_key: 'ohp',
                sets: [{ sets: 3, reps: 5, intensity: 0.75, intensity_type: 'percentage_tm' }],
              },
            ],
          },
        ],
      },
    })

    render(<ReviewStep />)

    expect(screen.getByText('Overhead Press')).toBeInTheDocument()
  })

  it('renders week-specific sections when the draft includes explicit cycle layouts', () => {
    const draft = useBuilderDraftStore.getState().draft

    useBuilderDraftStore.setState({
      draft: {
        ...draft,
        cycle_length_weeks: 2,
        days: [
          {
            label: 'Week 1 Press',
            exercise_blocks: [
              {
                role: 'primary',
                exercise_id: 1,
                exercise_key: 'Squat',
                sets: [{ sets: 3, reps: 5, intensity: 0.75, intensity_type: 'percentage_tm' }],
              },
            ],
          },
        ],
        week_schemes: {
          1: { label: 'Week 1 - Base' },
          2: {
            label: 'Week 2 - Intensification',
            days: [
              {
                label: 'Week 2 Press',
                exercise_blocks: [
                  {
                    role: 'primary',
                    exercise_id: 2,
                    exercise_key: 'Bench Press',
                    sets: [{ sets: 5, reps: 3, intensity: 0.8, intensity_type: 'percentage_tm' }],
                  },
                ],
              },
            ],
          },
        },
      },
    })

    render(<ReviewStep />)

    expect(screen.getByText('Week 1')).toBeInTheDocument()
    expect(screen.getByText('Week 1 - Base')).toBeInTheDocument()
    expect(screen.getByText('Week 2')).toBeInTheDocument()
    expect(screen.getByText('Week 2 - Intensification')).toBeInTheDocument()
    expect(screen.getByText('Week 1 Press')).toBeInTheDocument()
    expect(screen.getByText('Week 2 Press')).toBeInTheDocument()
  })

  it('requires current training maxes before saving a TM-backed program', () => {
    const draft = useBuilderDraftStore.getState().draft

    useBuilderDraftStore.setState({
      draft: {
        ...draft,
        uses_training_max: true,
        days: [
          {
            label: 'Day 1',
            exercise_blocks: [
              {
                role: 'primary',
                exercise_id: 1,
                exercise_key: 'Squat',
                sets: [{ sets: 3, reps: 5, intensity: 0.75, intensity_type: 'percentage_tm' }],
              },
            ],
          },
        ],
      },
    })

    render(<ReviewStep />)

    expect(screen.getByText('Required Training Maxes')).toBeInTheDocument()
    expect(screen.getByText('Set current training maxes for Squat before you save this program.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Program' })).toBeDisabled()
  })

  it('enables save once the required training maxes already exist', () => {
    const draft = useBuilderDraftStore.getState().draft

    useBuilderDraftStore.setState({
      draft: {
        ...draft,
        uses_training_max: true,
        days: [
          {
            label: 'Day 1',
            exercise_blocks: [
              {
                role: 'primary',
                exercise_id: 1,
                exercise_key: 'Squat',
                sets: [{ sets: 3, reps: 5, intensity: 0.75, intensity_type: 'percentage_tm' }],
              },
            ],
          },
        ],
      },
    })
    mocks.useCurrentTrainingMaxes.mockReturnValue({
      data: [
        {
          id: 1,
          exercise_id: 1,
          weight_lbs: 315,
          tm_percentage: 0.9,
          effective_date: '2026-04-01',
          created_at: null,
          user_id: 'user-1',
        },
      ],
      isLoading: false,
    })

    render(<ReviewStep />)

    expect(screen.getByText('All required training maxes are set for this program.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Program' })).toBeEnabled()
  })

  it('does not require training maxes when only a legacy TM flag remains', () => {
    const draft = useBuilderDraftStore.getState().draft

    useBuilderDraftStore.setState({
      draft: {
        ...draft,
        uses_training_max: true,
        days: [
          {
            label: 'Day 1',
            exercise_blocks: [
              {
                role: 'primary',
                exercise_id: 1,
                exercise_key: 'Squat',
                sets: [{ sets: 3, reps: 5, intensity: 225, intensity_type: 'fixed_weight' }],
              },
            ],
          },
        ],
      },
    })

    render(<ReviewStep />)

    expect(screen.queryByText('Required Training Maxes')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Program' })).toBeEnabled()
  })

  it('requires training maxes for non-primary lifts that still use TM-backed prescriptions', () => {
    const draft = useBuilderDraftStore.getState().draft

    useBuilderDraftStore.setState({
      draft: {
        ...draft,
        uses_training_max: false,
        days: [
          {
            label: 'Day 1',
            exercise_blocks: [
              {
                role: 'primary',
                exercise_id: 1,
                exercise_key: 'Squat',
                sets: [{ sets: 3, reps: 5, intensity: 225, intensity_type: 'fixed_weight' }],
              },
              {
                role: 'variation',
                exercise_id: 2,
                exercise_key: 'Bench Press',
                sets: [{ sets: 3, reps: 8, intensity: 0.7, intensity_type: 'percentage_1rm' }],
              },
            ],
          },
        ],
      },
    })

    render(<ReviewStep />)

    expect(screen.getByText('Required 1RM Inputs')).toBeInTheDocument()
    expect(screen.getByText('Set current estimated 1RMs for Bench Press before you save this program.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Program' })).toBeDisabled()
  })

  it('shows the history preservation note when editing a saved program with logged history', () => {
    const draft = useBuilderDraftStore.getState().draft

    useBuilderDraftStore.setState({
      draft: {
        ...draft,
        name: '5/3/1 BBB',
        days: [
          {
            label: 'Bench Day',
            exercise_blocks: [
              {
                role: 'primary',
                exercise_id: 2,
                exercise_key: 'Bench Press',
                sets: [{ sets: 3, reps: 5, intensity: 0.75, intensity_type: 'percentage_tm' }],
              },
            ],
          },
        ],
      },
      source: {
        kind: 'program',
        mode: 'edit',
        template_key: 'wendler_531',
        program_id: 12,
        program_name: '5/3/1 BBB',
        is_active: true,
        save_strategy: 'update',
        has_workout_history: true,
      },
    })

    render(<ReviewStep />)

    expect(screen.getByText(/Completed cycles keep their saved program snapshots/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
  })

  it('blocks saving when a block name is still ambiguous or unresolved', () => {
    const draft = useBuilderDraftStore.getState().draft

    mocks.useExercises.mockReturnValue({
      data: [
        {
          id: 1,
          name: 'Bench Press',
          category: 'main',
          movement_pattern: 'horizontal_push',
          is_main_lift: true,
          strength_lift_slug: 'bench_press',
          created_at: null,
          created_by_user_id: null,
        },
        {
          id: 2,
          name: 'Bench Press',
          category: 'accessory',
          movement_pattern: 'horizontal_push',
          is_main_lift: false,
          strength_lift_slug: null,
          created_at: null,
          created_by_user_id: 'user-1',
        },
      ],
      isLoading: false,
    })

    useBuilderDraftStore.setState({
      draft: {
        ...draft,
        uses_training_max: false,
        days: [
          {
            label: 'Day 1',
            exercise_blocks: [
              {
                role: 'primary',
                exercise_key: 'Bench Press',
                sets: [{ sets: 3, reps: 5, intensity: 225, intensity_type: 'fixed_weight' }],
              },
            ],
          },
        ],
      },
    })

    render(<ReviewStep />)

    expect(screen.getByText('Choose library exercises for Bench Press (Day 1) before you save this program.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Program' })).toBeDisabled()
  })

  it('blocks saving when a stale exercise id no longer exists in the library', () => {
    const draft = useBuilderDraftStore.getState().draft

    useBuilderDraftStore.setState({
      draft: {
        ...draft,
        uses_training_max: false,
        days: [
          {
            label: 'Day 1',
            exercise_blocks: [
              {
                role: 'primary',
                exercise_id: 999,
                exercise_key: 'Bench Press',
                sets: [{ sets: 3, reps: 5, intensity: 225, intensity_type: 'fixed_weight' }],
              },
            ],
          },
        ],
      },
    })

    render(<ReviewStep />)

    expect(screen.getByText('Choose library exercises for Bench Press (Day 1) before you save this program.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Program' })).toBeDisabled()
  })
})
