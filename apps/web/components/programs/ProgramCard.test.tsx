import { type ComponentProps } from 'react'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProgramCard } from './ProgramCard'

const trainingMaxPanelPropsMock = vi.fn()

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/hooks/usePrograms', () => ({
  useSetActiveProgram: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
  useDeleteProgram: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
}))

vi.mock('@/components/exercises/TrainingMaxPanel', () => ({
  TrainingMaxPanel: (props: { title: string; targetExerciseKeys?: string[]; targetExerciseIds?: number[] }) => {
    trainingMaxPanelPropsMock(props)
    return <div>{props.title}</div>
  },
}))

vi.mock('@/components/programs/CompleteCycleDialog', () => ({
  CompleteCycleDialog: () => <button type="button">Cycle Checkpoint</button>,
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('ProgramCard', () => {
  beforeEach(() => {
    trainingMaxPanelPropsMock.mockClear()
  })

  it('keeps training max details but does not show the template difficulty badge', () => {
    render(
      <ProgramCard
        program={{
          id: 1,
          user_id: 'user-1',
          name: '5/3/1 Leader',
          template_key: 'wendler_531',
          config: {
            variation_key: 'bbb',
            tm_percentage: 0.9,
            rounding: 5,
          },
          is_active: false,
          start_date: '2026-04-10',
          created_at: null,
          updated_at: null,
        }}
      />,
    )

    expect(screen.getByText(/4 days per week · 4-week cycle/i)).toBeInTheDocument()
    expect(screen.getByText(/TM 90%/)).toBeInTheDocument()
    expect(screen.queryByText(/beginner|intermediate|advanced/i)).not.toBeInTheDocument()
  })

  it('shows edit and delete actions for inactive customized programs', () => {
    render(
      <ProgramCard
        program={{
          id: 12,
          user_id: 'user-1',
          name: '5/3/1 Anchor',
          template_key: 'wendler_531',
          config: {
            type: 'custom',
            days_per_week: 4,
            cycle_length_weeks: 4,
            uses_training_max: true,
            tm_percentage: 0.9,
            rounding: 5,
            week_schemes: {
              1: { label: '5s Week', intensity_modifier: 1 },
            },
            progression: {
              style: 'linear_per_cycle',
              increment_lbs: { upper: 5, lower: 10 },
            },
            metadata: {
              source_template_key: 'wendler_531',
              selected_variation_key: 'bbb',
            },
            days: [
              {
                label: 'OHP Day',
                exercise_blocks: [
                  {
                    role: 'primary',
                    exercise_key: 'ohp',
                    sets: [{ sets: 1, reps: 5, intensity: 0.65, intensity_type: 'percentage_tm' }],
                  },
                ],
              },
            ],
          },
          is_active: false,
          start_date: '2026-04-10',
          created_at: null,
          updated_at: null,
        }}
      />,
    )

    expect(screen.getByText('Customized')).toBeInTheDocument()
    expect(screen.getByText(/Based on Wendler's 5\/3\/1/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /edit/i })).toHaveAttribute('href', '/programs/builder?programId=12')
    expect(screen.getByRole('button', { name: /set active/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('reveals inline training max access only for programs that need it', async () => {
    const user = userEvent.setup()

    render(
      <ProgramCard
        program={{
          id: 22,
          user_id: 'user-1',
          name: 'Wendler 5/3/1 BBB',
          template_key: 'wendler_531',
          config: { variation_key: 'bbb', rounding: 5 },
          is_active: true,
          start_date: '2026-04-10',
          created_at: null,
          updated_at: null,
        }}
      />,
    )

    const toggle = screen.getByRole('button', { name: 'Training Maxes' })
    await user.click(toggle)

    expect(screen.getByText('Program Training Maxes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide Training Maxes' })).toBeInTheDocument()
    const latestCall = trainingMaxPanelPropsMock.mock.calls.at(-1)?.[0]
    expect(latestCall?.targetExerciseKeys).toEqual(expect.arrayContaining(['squat', 'bench', 'deadlift', 'ohp']))
    expect(latestCall?.targetExerciseKeys).toHaveLength(4)
    expect(latestCall?.targetExerciseKeys).not.toEqual(expect.arrayContaining(['front_squat', 'power_clean', 'push_press']))
  })

  it('keeps inline training max access available for inactive programs that still need it', async () => {
    const user = userEvent.setup()

    render(
      <ProgramCard
        program={{
          id: 24,
          user_id: 'user-1',
          name: 'Wendler 5/3/1',
          template_key: 'wendler_531',
          config: { variation_key: 'bbb', rounding: 5 },
          is_active: false,
          start_date: '2026-04-10',
          created_at: null,
          updated_at: null,
        }}
      />,
    )

    const toggle = screen.getByRole('button', { name: 'Training Maxes' })
    await user.click(toggle)

    expect(screen.getByText('Program Training Maxes')).toBeInTheDocument()
  })

  it('keeps the ProgramCard panel scoped to primary lifts even when a non-primary lift drives execution TM need', async () => {
    const user = userEvent.setup()

    render(
      <ProgramCard
        program={{
          id: 25,
          user_id: 'user-1',
          name: 'Custom Bench Volume',
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
                    exercise_key: 'Squat',
                    sets: [{ sets: 3, reps: 5, intensity: 225, intensity_type: 'fixed_weight' }],
                  },
                  {
                    role: 'variation',
                    exercise_key: 'Bench Press',
                    sets: [{ sets: 3, reps: 8, intensity: 0.7, intensity_type: 'percentage_1rm' }],
                  },
                ],
              },
            ],
            progression: {
              style: 'linear_per_cycle',
              increment_lbs: { upper: 5, lower: 10 },
            },
          },
          is_active: true,
          start_date: '2026-04-10',
          created_at: null,
          updated_at: null,
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Training Maxes' }))

    const latestCall = trainingMaxPanelPropsMock.mock.calls.at(-1)?.[0]
    expect(latestCall?.targetExerciseKeys).toEqual(expect.arrayContaining(['Squat']))
    expect(latestCall?.targetExerciseKeys).toHaveLength(1)
    expect(latestCall?.targetExerciseKeys).not.toEqual(expect.arrayContaining(['Bench Press']))
  })

  it('does not show training max access for programs with no TM-backed execution', () => {
    render(
      <ProgramCard
        program={{
          id: 23,
          user_id: 'user-1',
          name: 'Starting Strength',
          template_key: 'starting_strength',
          config: { rounding: 5 },
          is_active: true,
          start_date: '2026-04-10',
          created_at: null,
          updated_at: null,
        }}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Training Maxes' })).not.toBeInTheDocument()
  })
})