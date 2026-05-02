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
  startRestTimerMock,
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
    startRestTimerMock: vi.fn(),
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
      startRestTimer: (timer: { durationSeconds: number; label?: string | null; sourceSetOrder?: number | null; workoutId?: number | null }) => void
      hasShownPrToast: (toastKey: string) => boolean
      markPrToastShown: (toastKey: string) => void
    }) => unknown,
  ) =>
    selector({
      startRestTimer: startRestTimerMock,
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
  block_id: 'squat-main',
  block_order: 1,
  block_role: 'primary' as const,
  prescribed_intensity: 0.75,
  prescribedIntensity: 0.75,
  prescribedWeightLbs: 225,
  prescriptionBaseWeightLbs: 300,
  weight_lbs: 225,
  reps_prescribed: 5,
  reps_prescribed_max: undefined,
  is_amrap: false,
  intensity_type: 'percentage_tm' as const,
  execution_group: undefined,
  rest_seconds: 180,
  prescribedRpe: null,
  rpe: null,
  notes: undefined,
  exerciseId: 2,
  exerciseName: 'Squat',
  loggedAt: null,
  repsActual: null,
  workoutId: 44,
  workoutSetId: 4401,
}

describe('SetRow', () => {
  beforeEach(() => {
    historicalAmrapState.data = []
    hasShownPrToastMock.mockReset()
    hasShownPrToastMock.mockReturnValue(false)
    markPrToastShownMock.mockReset()
    mutateMock.mockReset()
    refetchMock.mockClear()
    startRestTimerMock.mockReset()
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()
  })

  it('renders set info', () => {
    render(<SetRow set={baseSet} userId="user-1" />)

    expect(screen.getByText('Squat')).toBeInTheDocument()
    expect(screen.getByText(/225 lbs × 5 reps/i)).toBeInTheDocument()
    expect(screen.getByText('Main')).toBeInTheDocument()
  })

  it('renders backoff work distinctly from generic variation work', () => {
    render(
      <SetRow
        set={{
          ...baseSet,
          block_role: 'primary',
          display_type: 'backoff',
          set_type: 'variation',
        }}
        userId="user-1"
      />,
    )

    expect(screen.getByText('Backoff')).toBeInTheDocument()
    expect(screen.queryByText('Variation')).not.toBeInTheDocument()
  })

  it('renders drop-set work distinctly from generic variation work', () => {
    render(
      <SetRow
        set={{
          ...baseSet,
          block_role: 'primary',
          display_type: 'drop',
          set_type: 'variation',
        }}
        userId="user-1"
      />,
    )

    expect(screen.getByText('Drop')).toBeInTheDocument()
    expect(screen.queryByText('Variation')).not.toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: /log planned/i }))

    expect(onSyncStateChange).toHaveBeenCalledWith({ status: 'dirty' })
    expect(startRestTimerMock).toHaveBeenCalledWith({
      durationSeconds: 180,
      label: 'Squat',
      sourceSetOrder: 1,
      workoutId: 44,
    })
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
        actualRpe: null,
      }),
      expect.objectContaining({
        onError: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
    )
  })

  it('does not auto-start rest when the row disables grouped-step rest timing', async () => {
    const user = userEvent.setup()

    render(<SetRow autoStartRestTimer={false} set={baseSet} userId="user-1" />)

    await user.click(screen.getByRole('button', { name: /log planned/i }))

    expect(startRestTimerMock).not.toHaveBeenCalled()
  })

  it('allows adjusted logging for a main set', async () => {
    const user = userEvent.setup()

    render(<SetRow set={baseSet} userId="user-1" />)

    await user.click(screen.getByRole('button', { name: /^adjust$/i }))
    expect(screen.queryByLabelText(/actual effort/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'RPE' })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'RIR' })).not.toBeInTheDocument()
    expect(screen.queryByText(/leave this blank when effort capture/i)).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText(/load \(lbs\)/i))
    await user.type(screen.getByLabelText(/load \(lbs\)/i), '205')
    await user.clear(screen.getByLabelText(/reps achieved/i))
    await user.type(screen.getByLabelText(/reps achieved/i), '6')
    await user.click(screen.getByRole('button', { name: /save set/i }))

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actualRpe: null,
        repsActual: 6,
        weightLbs: 205,
      }),
      expect.any(Object),
    )
  })

  it('passes canonical actual effort when logging through the detailed editor', async () => {
    const user = userEvent.setup()

    render(
      <SetRow
        set={{
          ...baseSet,
          intensity_type: 'rpe',
          prescribedRpe: 8,
        }}
        userId="user-1"
      />,
    )

    expect(screen.queryByRole('button', { name: /log planned/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /enter details/i }))
    expect(screen.getByLabelText(/actual effort/i)).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'RIR' }))
    await user.type(screen.getByLabelText(/actual effort/i), '2')
    await user.click(screen.getByRole('button', { name: /save set/i }))

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actualRpe: 8,
        repsActual: 5,
      }),
      expect.any(Object),
    )
  })

  it('shows planned versus logged output after an adjusted set is saved', () => {
    render(
      <SetRow
        set={{
          ...baseSet,
          repsActual: 6,
          weight_lbs: 215,
        }}
        userId="user-1"
      />,
    )

    expect(screen.getByText('Planned 225 lbs × 5 reps')).toBeInTheDocument()
    expect(screen.getByText('Logged 215 lbs × 6 reps')).toBeInTheDocument()
    expect(screen.getByText('Logged with adjustments')).toBeInTheDocument()
  })

  it('shows prescribed and logged effort separately once a set is complete', () => {
    render(
      <SetRow
        set={{
          ...baseSet,
          intensity_type: 'rpe',
          prescribedRpe: 8,
          repsActual: 5,
          rpe: 9,
        }}
        userId="user-1"
      />,
    )

    expect(screen.getByText('Target RPE 8')).toBeInTheDocument()
    expect(screen.getByText('Logged RPE 9 (1 RIR)')).toBeInTheDocument()
  })

  it('treats rounded-equivalent completed loads as planned work', () => {
    render(
      <SetRow
        set={{
          ...baseSet,
          prescribedWeightLbs: 222.6,
          repsActual: 5,
          weight_lbs: 223.1,
        }}
        userId="user-1"
      />,
    )

    expect(screen.getByText('Logged as planned')).toBeInTheDocument()
    expect(screen.queryByText('Logged with adjustments')).not.toBeInTheDocument()
  })

  it('treats completed AMRAP work at the planned load as planned and shows actual reps', () => {
    render(
      <SetRow
        set={{
          ...baseSet,
          is_amrap: true,
          repsActual: 8,
          set_type: 'amrap',
        }}
        userId="user-1"
      />,
    )

    expect(screen.getByText('Logged as planned')).toBeInTheDocument()
    expect(screen.getByText('Logged 225 lbs × 8 reps')).toBeInTheDocument()
    expect(screen.queryByText('Logged with adjustments')).not.toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: /log reps/i }))
    await user.clear(screen.getByLabelText(/reps achieved/i))
    await user.type(screen.getByLabelText(/reps achieved/i), '8')
    await user.click(screen.getByRole('button', { name: /save set/i }))

    await waitFor(() => {
      expect(refetchMock).toHaveBeenCalledTimes(1)
      expect(markPrToastShownMock).toHaveBeenCalledWith('44:1:8')
      expect(toastSuccessMock).toHaveBeenCalledWith('New Squat estimated 1RM PR: 285 lbs')
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

    await user.click(screen.getByRole('button', { name: /log reps/i }))
    await user.clear(screen.getByLabelText(/reps achieved/i))
    await user.type(screen.getByLabelText(/reps achieved/i), '8.5')

    expect(screen.queryByText(/estimated 1rm:/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save set/i })).toBeDisabled()
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

    await user.click(screen.getByRole('button', { name: /log reps/i }))
    await user.clear(screen.getByLabelText(/reps achieved/i))
    await user.type(screen.getByLabelText(/reps achieved/i), '8')
    await user.click(screen.getByRole('button', { name: /save set/i }))

    await waitFor(() => {
      expect(toastSuccessMock).not.toHaveBeenCalled()
      expect(markPrToastShownMock).not.toHaveBeenCalled()
    })
  })
})
