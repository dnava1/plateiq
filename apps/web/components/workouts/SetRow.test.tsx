import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SetRow } from './SetRow'

const {
  hasShownPrToastMock,
  historicalAmrapState,
  markPrToastShownMock,
  mutateMock,
  refetchMock,
  toastErrorMock,
  toastSuccessMock,
} = vi.hoisted(() => {
  const historicalAmrapState = {
    data: [] as Array<{
      reps_actual: number
      reps_prescribed: number
      set_order: number
      weight_lbs: number
      workout_id: number
    }>,
  }

  return {
    historicalAmrapState,
    hasShownPrToastMock: vi.fn(() => false),
    markPrToastShownMock: vi.fn(),
    mutateMock: vi.fn(),
    refetchMock: vi.fn(async () => ({ data: historicalAmrapState.data })),
    toastErrorMock: vi.fn(),
    toastSuccessMock: vi.fn(),
  }
})

vi.mock('@/hooks/usePreferredUnit', () => ({
  usePreferredUnit: () => 'lbs',
}))

vi.mock('@/hooks/useWorkouts', () => ({
  useHistoricalAmrapSets: () => ({
    data: historicalAmrapState.data,
    refetch: refetchMock,
  }),
  useLogSet: () => ({
    mutate: mutateMock,
    isPending: false,
  }),
}))

vi.mock('@/store/workoutSessionStore', () => ({
  useWorkoutSessionStore: (
    selector: (state: {
      hasShownPrToast: (toastKey: string) => boolean
      markPrToastShown: (toastKey: string) => void
    }) => unknown,
  ) =>
    selector({
      hasShownPrToast: hasShownPrToastMock,
      markPrToastShown: markPrToastShownMock,
    }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}))

const baseSet = {
  exercise_key: 'squat',
  exercise_id: 2,
  set_order: 1,
  set_type: 'main' as const,
  weight_lbs: 225,
  reps_prescribed: 5,
  reps_prescribed_max: undefined,
  is_amrap: false,
  intensity_type: 'percentage_tm' as const,
  rpe: undefined,
  notes: undefined,
  exerciseId: 2,
  exerciseName: 'Squat',
  loggedAt: null,
  repsActual: null,
  workoutId: 44,
}

describe('SetRow', () => {
  beforeEach(() => {
    historicalAmrapState.data = []
    hasShownPrToastMock.mockReset()
    hasShownPrToastMock.mockReturnValue(false)
    markPrToastShownMock.mockReset()
    mutateMock.mockReset()
    refetchMock.mockClear()
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()
  })

  it('renders set info', () => {
    render(<SetRow set={baseSet} userId="user-1" />)

    expect(screen.getByText('Squat')).toBeInTheDocument()
    expect(screen.getByText(/225 lbs × 5 reps/i)).toBeInTheDocument()
    expect(screen.getByText('Main')).toBeInTheDocument()
  })

  it('log button triggers the mutation', async () => {
    const user = userEvent.setup()
    const onSyncStateChange = vi.fn()

    render(
      <SetRow
        set={baseSet}
        userId="user-1"
        onSyncStateChange={onSyncStateChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^log$/i }))

    expect(onSyncStateChange).toHaveBeenCalledWith({ status: 'dirty' })
    expect(mutateMock).toHaveBeenCalledTimes(1)
    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workoutId: 44,
        exerciseId: 2,
        setOrder: 1,
        setType: 'main',
        weightLbs: 225,
        repsPrescribed: 5,
        repsActual: 5,
      }),
      expect.objectContaining({
        onError: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
    )
  })

  it('announces a new AMRAP PR after a successful save', async () => {
    const user = userEvent.setup()
    historicalAmrapState.data = [
      {
        workout_id: 12,
        set_order: 3,
        weight_lbs: 225,
        reps_actual: 5,
        reps_prescribed: 5,
      },
    ]
    mutateMock.mockImplementation((_input, options) => {
      void options?.onSuccess?.({
        id: 91,
        workout_id: 44,
        exercise_id: 2,
        user_id: 'user-1',
        set_order: 1,
        set_type: 'amrap',
        weight_lbs: 225,
        reps_prescribed: 5,
        reps_prescribed_max: null,
        reps_actual: 8,
        is_amrap: true,
        rpe: null,
        intensity_type: 'percentage_tm',
        logged_at: '2026-04-10T12:34:56.000Z',
        updated_at: '2026-04-10T12:34:56.000Z',
      })
    })

    render(
      <SetRow
        set={{
          ...baseSet,
          is_amrap: true,
          set_type: 'amrap',
        }}
        userId="user-1"
      />,
    )

    await user.click(screen.getByRole('button', { name: /^log$/i }))
    await user.clear(screen.getByLabelText(/reps achieved/i))
    await user.type(screen.getByLabelText(/reps achieved/i), '8')
    await user.click(screen.getByRole('button', { name: /save reps/i }))

    await waitFor(() => {
      expect(refetchMock).toHaveBeenCalledTimes(1)
      expect(markPrToastShownMock).toHaveBeenCalledWith('44:1:8')
      expect(toastSuccessMock).toHaveBeenCalledWith('New Squat estimated 1RM PR: 279.3 lbs')
    })
  })

  it('blocks fractional reps in the AMRAP entry flow', async () => {
    const user = userEvent.setup()

    render(
      <SetRow
        set={{
          ...baseSet,
          is_amrap: true,
          set_type: 'amrap',
        }}
        userId="user-1"
      />,
    )

    await user.click(screen.getByRole('button', { name: /^log$/i }))
    await user.clear(screen.getByLabelText(/reps achieved/i))
    await user.type(screen.getByLabelText(/reps achieved/i), '8.5')

    expect(screen.queryByText(/estimated 1rm:/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save reps/i })).toBeDisabled()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('does not re-announce a PR that is already in the session ledger', async () => {
    const user = userEvent.setup()
    hasShownPrToastMock.mockReturnValue(true)
    mutateMock.mockImplementation((_input, options) => {
      void options?.onSuccess?.({
        id: 91,
        workout_id: 44,
        exercise_id: 2,
        user_id: 'user-1',
        set_order: 1,
        set_type: 'amrap',
        weight_lbs: 225,
        reps_prescribed: 5,
        reps_prescribed_max: null,
        reps_actual: 8,
        is_amrap: true,
        rpe: null,
        intensity_type: 'percentage_tm',
        logged_at: '2026-04-10T12:34:56.000Z',
        updated_at: '2026-04-10T12:34:56.000Z',
      })
    })

    render(
      <SetRow
        set={{
          ...baseSet,
          is_amrap: true,
          set_type: 'amrap',
        }}
        userId="user-1"
      />,
    )

    await user.click(screen.getByRole('button', { name: /^log$/i }))
    await user.clear(screen.getByLabelText(/reps achieved/i))
    await user.type(screen.getByLabelText(/reps achieved/i), '8')
    await user.click(screen.getByRole('button', { name: /save reps/i }))

    await waitFor(() => {
      expect(toastSuccessMock).not.toHaveBeenCalled()
      expect(markPrToastShownMock).not.toHaveBeenCalled()
    })
  })
})