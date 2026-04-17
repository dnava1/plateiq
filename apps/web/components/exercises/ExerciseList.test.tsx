import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ExerciseList } from './ExerciseList'
import type { Tables } from '@/types/database'

vi.mock('@/hooks/usePreferredWeightRounding', () => ({
  usePreferredWeightRounding: () => 5,
}))

const exercises: Array<Tables<'exercises'>> = [
  {
    id: 1,
    name: 'Bench Press',
    category: 'main',
    is_main_lift: true,
    movement_pattern: 'push',
    created_by_user_id: null,
    progression_increment_lbs: 5,
    strength_lift_slug: 'bench-press',
    created_at: null,
  },
  {
    id: 2,
    name: 'Barbell Row',
    category: 'accessory',
    is_main_lift: false,
    movement_pattern: 'pull',
    created_by_user_id: 'user-1',
    progression_increment_lbs: null,
    strength_lift_slug: null,
    created_at: null,
  },
]

describe('ExerciseList', () => {
  it('gives the search field an accessible name', () => {
    render(<ExerciseList exercises={exercises} unit="lbs" />)

    expect(screen.getByRole('searchbox', { name: 'Search exercises' })).toHaveAttribute(
      'placeholder',
      'Filter by name',
    )
  })

  it('filters exercises by the typed query', async () => {
    const user = userEvent.setup()

    render(<ExerciseList exercises={exercises} unit="lbs" />)

    await user.type(screen.getByRole('searchbox', { name: 'Search exercises' }), 'bench')

    expect(screen.getByText('Bench Press')).toBeInTheDocument()
    expect(screen.queryByText('Barbell Row')).not.toBeInTheDocument()
  })
})