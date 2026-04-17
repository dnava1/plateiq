import { type ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProgramCard } from './ProgramCard'

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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('ProgramCard', () => {
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
})