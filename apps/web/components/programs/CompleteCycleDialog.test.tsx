import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CompleteCycleDialog } from './CompleteCycleDialog'

const clearSessionMock = vi.fn()
const mutateMock = vi.fn()

vi.mock('@/hooks/usePreferredUnit', () => ({
  usePreferredUnit: () => 'lbs',
}))

vi.mock('@/hooks/useCycleCompletion', () => ({
  buildCycleProgressionPayload: vi.fn((rows: Array<{ exerciseId: number; incrementLbs: number }>) =>
    rows.map((row) => ({ exercise_id: row.exerciseId, increment_lbs: row.incrementLbs }))),
  useCompleteCycle: () => ({
    mutate: mutateMock,
    isPending: false,
  }),
  useCycleCompletionPreview: () => ({
    activeCycle: { id: 7, cycle_number: 4 },
    previewRows: [
      {
        exerciseId: 1,
        exerciseKey: 'squat',
        exerciseName: 'Squat',
        currentTmLbs: 300,
        incrementLbs: 10,
        newTmLbs: 310,
        reason: 'Cycle completion applies one base increment for the next block.',
      },
    ],
    isLoading: false,
  }),
}))

vi.mock('@/store/workoutSessionStore', () => ({
  useWorkoutSessionStore: (selector: (state: { clearSession: () => void }) => unknown) =>
    selector({ clearSession: clearSessionMock }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

describe('CompleteCycleDialog', () => {
  it('renders the preview rows for the next cycle', async () => {
    const user = userEvent.setup()

    render(
      <CompleteCycleDialog
        program={{
          id: 12,
          user_id: 'user-1',
          name: '5/3/1',
          template_key: 'wendler_531',
          config: { variation_key: 'bbb', rounding: 5, tm_percentage: 0.9 },
          is_active: true,
          start_date: '2026-04-10',
          created_at: null,
          updated_at: null,
        }}
      />,
    )

    await user.click(screen.getAllByRole('button', { name: /complete cycle/i })[0])

    expect(screen.getByText('Squat')).toBeInTheDocument()
    expect(screen.getByText('Current TM')).toBeInTheDocument()
    expect(screen.getByText('300 lbs')).toBeInTheDocument()
    expect(screen.getAllByText('+10 lbs')).toHaveLength(2)
    expect(screen.getByText('310 lbs')).toBeInTheDocument()
  })
})