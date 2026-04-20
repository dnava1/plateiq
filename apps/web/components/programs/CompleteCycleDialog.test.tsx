import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CompleteCycleDialog } from './CompleteCycleDialog'

const clearSessionMock = vi.fn()
const mutateMock = vi.fn()
const useCycleCompletionPreviewMock = vi.fn()

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
  useCycleCompletionPreview: () => useCycleCompletionPreviewMock(),
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
  it.each([
    {
      currentTmLbs: 300,
      incrementLbs: 10,
      newTmLbs: 310,
      reason: 'Cycle completion applies one base increment for the next block.',
      expectedBadge: '+10 lbs',
      expectedNextTm: '310 lbs',
    },
    {
      currentTmLbs: 300,
      incrementLbs: 0,
      newTmLbs: 300,
      reason: 'Best AMRAP performance missed the target by 2 reps, so the training max holds for the next cycle while you decide whether to deload manually.',
      expectedBadge: 'Hold',
      expectedNextTm: '300 lbs',
    },
  ])('renders the preview rows for the next cycle', async ({ currentTmLbs, incrementLbs, newTmLbs, reason, expectedBadge, expectedNextTm }) => {
    useCycleCompletionPreviewMock.mockReturnValue({
      activeCycle: { id: 7, cycle_number: 4 },
      previewRows: [
        {
          exerciseId: 1,
          exerciseKey: 'squat',
          exerciseName: 'Squat',
          currentTmLbs,
          incrementLbs,
          newTmLbs,
          reason,
        },
      ],
      isLoading: false,
    })

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

    await user.click(screen.getAllByRole('button', { name: /cycle checkpoint/i })[0])

    expect(screen.getByText('Squat')).toBeInTheDocument()
    expect(screen.getByText('Current TM')).toBeInTheDocument()
    expect(screen.getAllByText('300 lbs').length).toBeGreaterThan(0)
    expect(screen.getAllByText(expectedBadge)).toHaveLength(2)
    expect(screen.getAllByText(expectedNextTm).length).toBeGreaterThan(0)
    expect(screen.getByText(reason)).toBeInTheDocument()
  })

  it('reframes non-TM programs as the current cycle checkpoint instead of a TM review surface', async () => {
    useCycleCompletionPreviewMock.mockReturnValue({
      activeCycle: { id: 7, cycle_number: 4 },
      previewRows: [],
      isLoading: false,
    })

    const user = userEvent.setup()

    render(
      <CompleteCycleDialog
        program={{
          id: 12,
          user_id: 'user-1',
          name: 'Texas Method',
          template_key: 'texas_method',
          config: { rounding: 5 },
          is_active: true,
          start_date: '2026-04-10',
          created_at: null,
          updated_at: null,
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: /cycle checkpoint/i }))

    expect(screen.getByRole('heading', { name: 'Cycle Checkpoint' })).toBeInTheDocument()
    expect(screen.getByText(/This is the current TM-first checkpoint for rolling the block forward/i)).toBeInTheDocument()
    expect(screen.getByText(/Training max is not the organizing model for this program/i)).toBeInTheDocument()
  })
})