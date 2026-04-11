import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProgramCard } from './ProgramCard'

vi.mock('@/hooks/usePrograms', () => ({
  useSetActiveProgram: () => ({
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
            supplement_key: 'bbb',
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
})