import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ExerciseList } from './ExerciseList'
import type { Tables } from '@/types/database'

vi.mock('@/hooks/usePreferredWeightRounding', () => ({
  usePreferredWeightRounding: () => 5,
}))

vi.mock('./CreateExerciseForm', () => ({
  CreateExerciseForm: ({ open, existingExercise, onUpdated }: {
    open: boolean
    existingExercise?: Tables<'exercises'> | null
    onUpdated?: (exercise: Tables<'exercises'>) => void
  }) => (
    open && existingExercise ? (
      <div>
        <p>Edit exercise dialog</p>
        <button type="button" onClick={() => onUpdated?.(existingExercise)}>
          Finish edit
        </button>
      </div>
    ) : null
  ),
}))

const exercises: Array<Tables<'exercises'>> = [
  {
    analytics_track: 'standard',
    id: 1,
    name: 'Bench Press',
    category: 'main',
    is_main_lift: true,
    movement_pattern: 'horizontal_push',
    created_by_user_id: null,
    progression_increment_lbs: 5,
    strength_lift_slug: 'bench-press',
    created_at: null,
  },
  {
    analytics_track: 'standard',
    id: 2,
    name: 'Barbell Row',
    category: 'accessory',
    is_main_lift: false,
    movement_pattern: 'horizontal_pull',
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

  it('shows edit actions only for custom exercises', async () => {
    const user = userEvent.setup()

    render(<ExerciseList exercises={exercises} unit="lbs" />)

    expect(screen.queryByRole('button', { name: 'Edit Bench Press' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit Barbell Row' }))

    expect(screen.getByText('Edit exercise dialog')).toBeInTheDocument()
  })
})
