import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkoutSessionNoteCard } from './WorkoutSessionNoteCard'

const mocks = vi.hoisted(() => ({
  clearWorkoutNoteDraft: vi.fn(),
  setWorkoutNoteDraft: vi.fn(),
  state: {
    workoutNoteDrafts: {
      44: '',
    } as Record<number, string>,
  },
}))

vi.mock('@/store/workoutSessionStore', () => ({
  useWorkoutSessionStore: (
    selector: (state: {
      clearWorkoutNoteDraft: (workoutId: number) => void
      setWorkoutNoteDraft: (workoutId: number, note: string) => void
      workoutNoteDrafts: Record<number, string>
    }) => unknown,
  ) =>
    selector({
      clearWorkoutNoteDraft: mocks.clearWorkoutNoteDraft,
      setWorkoutNoteDraft: mocks.setWorkoutNoteDraft,
      workoutNoteDrafts: mocks.state.workoutNoteDrafts,
    }),
}))

describe('WorkoutSessionNoteCard', () => {
  beforeEach(() => {
    mocks.clearWorkoutNoteDraft.mockReset()
    mocks.setWorkoutNoteDraft.mockReset()
    mocks.state.workoutNoteDrafts = { 44: '' }
  })

  it('offers quick note templates for common workout deviations', async () => {
    const user = userEvent.setup()

    render(<WorkoutSessionNoteCard workoutId={44} />)

    await user.click(screen.getByRole('button', { name: /load change/i }))

    expect(mocks.setWorkoutNoteDraft).toHaveBeenCalledWith(44, 'Load change: ')
  })

  it('updates the workout note draft as the user types', () => {
    render(<WorkoutSessionNoteCard workoutId={44} />)

    fireEvent.change(screen.getByLabelText(/workout note/i), {
      target: { value: 'Swapped to dumbbells for the last set' },
    })

    expect(mocks.setWorkoutNoteDraft).toHaveBeenLastCalledWith(44, 'Swapped to dumbbells for the last set')
  })

  it('lets the user clear an existing session note', async () => {
    const user = userEvent.setup()
    mocks.state.workoutNoteDrafts = { 44: 'Rest extended: waited for a rack' }

    render(<WorkoutSessionNoteCard workoutId={44} />)

    await user.click(screen.getByRole('button', { name: /clear/i }))

    expect(mocks.clearWorkoutNoteDraft).toHaveBeenCalledWith(44)
  })
})