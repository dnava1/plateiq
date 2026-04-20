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
      ],
      isLoading: false,
    })
    mocks.useCurrentTrainingMaxes.mockReturnValue({
      data: [],
      isLoading: false,
    })
  })

  it('shows non-linear progression details in the review summary', () => {
    render(<ReviewStep />)

    expect(screen.getByText('Progression')).toBeInTheDocument()
    expect(screen.getByText('Style: Wave')).toBeInTheDocument()
    expect(screen.getByText('Deload decisions stay manual and happen during the current cycle checkpoint.')).toBeInTheDocument()
    expect(screen.queryByText('Deload trigger: Two stalled weeks')).not.toBeInTheDocument()
    expect(screen.queryByText('Deload strategy: Reduce volume by 50% for one week')).not.toBeInTheDocument()
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

    expect(screen.getByText('Required Training Maxes')).toBeInTheDocument()
    expect(screen.getByText('Set current training maxes for Bench Press before you save this program.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Program' })).toBeDisabled()
  })
})