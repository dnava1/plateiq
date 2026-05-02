import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { TrainingMaxPanel } from './TrainingMaxPanel'

const useExercisesMock = vi.fn()
const useCurrentTrainingMaxesMock = vi.fn()
const useTrainingMaxHistoryMock = vi.fn()
const mutateMock = vi.fn()

vi.mock('@/hooks/useExercises', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useExercises')>('@/hooks/useExercises')
  return {
    ...actual,
    useExercises: () => useExercisesMock(),
  }
})

vi.mock('@/hooks/useTrainingMaxes', () => ({
  useCurrentTrainingMaxes: () => useCurrentTrainingMaxesMock(),
  useTrainingMaxHistory: (exerciseId: number) => useTrainingMaxHistoryMock(exerciseId),
  useSetTrainingMax: () => ({
    mutate: mutateMock,
    isPending: false,
  }),
}))

vi.mock('@/hooks/usePreferredUnit', () => ({
  usePreferredUnit: () => 'lbs',
}))

vi.mock('@/hooks/usePreferredWeightRounding', () => ({
  usePreferredWeightRounding: () => 5,
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('TrainingMaxPanel', () => {
  beforeEach(() => {
    mutateMock.mockReset()
    useExercisesMock.mockReturnValue({
      data: [
        {
          id: 10,
          name: 'Safety Squat Bar',
          category: 'main',
          movement_pattern: 'squat',
          is_main_lift: true,
          strength_lift_slug: null,
          created_at: null,
          created_by_user_id: null,
        },
        {
          id: 11,
          name: 'Cable Fly',
          category: 'accessory',
          movement_pattern: 'push',
          is_main_lift: false,
          strength_lift_slug: null,
          created_at: null,
          created_by_user_id: null,
        },
      ],
      isLoading: false,
    })

    useCurrentTrainingMaxesMock.mockReturnValue({
      data: [
        {
          id: 101,
          exercise_id: 10,
          weight_lbs: 315,
          tm_percentage: 0.9,
          effective_date: '2026-04-01',
          created_at: null,
          user_id: 'user-1',
        },
      ],
      isLoading: false,
    })

    useTrainingMaxHistoryMock.mockImplementation((exerciseId: number) => ({
      data: exerciseId === 10
        ? [
            {
              id: 100,
              exercise_id: 10,
              weight_lbs: 300,
              tm_percentage: 0.9,
              effective_date: '2026-03-01',
              created_at: null,
              user_id: 'user-1',
            },
            {
              id: 101,
              exercise_id: 10,
              weight_lbs: 315,
              tm_percentage: 0.9,
              effective_date: '2026-04-01',
              created_at: null,
              user_id: 'user-1',
            },
          ]
        : [],
      isLoading: false,
    }))

    mutateMock.mockImplementation((_input, options) => {
      options?.onSuccess?.()
    })
  })

  it('supports history and TM updates for non-canonical main lifts', async () => {
    const user = userEvent.setup()

    render(
      <TrainingMaxPanel description="Manage max-enabled training maxes from the new shared surface." />,
    )

    const customLiftCard = screen.getByText('Safety Squat Bar').closest('[data-slot="card"]')

    expect(customLiftCard).not.toBeNull()
    const card = within(customLiftCard as HTMLElement)

    expect(card.getByText('315 lbs')).toBeInTheDocument()
    expect(screen.queryByText('Cable Fly')).not.toBeInTheDocument()

    await user.click(card.getByRole('button', { name: 'History' }))

    expect(screen.getByRole('heading', { name: 'Training Max History — Safety Squat Bar' })).toBeInTheDocument()
    expect(screen.getAllByText('TM 90%').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.click(card.getByRole('button', { name: 'Update TM' }))

    expect(screen.getByRole('heading', { name: 'Set Training Max - Safety Squat Bar' })).toBeInTheDocument()

    const tmInput = screen.getByLabelText('Training Max (lbs)')
    fireEvent.change(tmInput, { target: { value: '320' } })
    await user.click(screen.getByRole('button', { name: 'Save Training Max' }))

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseId: 10,
        weightLbs: 320,
        tmPercentage: 0.9,
      }),
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    )
  })

  it('limits the panel to the selected scoped lifts when a program passes explicit targets', () => {
    useExercisesMock.mockReturnValue({
      data: [
        {
          id: 10,
          name: 'Safety Squat Bar',
          category: 'main',
          movement_pattern: 'squat',
          is_main_lift: true,
          strength_lift_slug: null,
          created_at: null,
          created_by_user_id: null,
        },
        {
          id: 12,
          name: 'Front Squat',
          category: 'main',
          movement_pattern: 'squat',
          is_main_lift: true,
          strength_lift_slug: 'front_squat',
          created_at: null,
          created_by_user_id: null,
        },
        {
          id: 13,
          name: 'Push Press',
          category: 'main',
          movement_pattern: 'push',
          is_main_lift: true,
          strength_lift_slug: 'push_press',
          created_at: null,
          created_by_user_id: null,
        },
      ],
      isLoading: false,
    })

    render(
      <TrainingMaxPanel
        description="Manage max-enabled training maxes from the new shared surface."
        targetExerciseKeys={['Safety Squat Bar']}
        badgeLabel="Selected lifts"
      />,
    )

    expect(screen.getByText('Safety Squat Bar')).toBeInTheDocument()
    expect(screen.queryByText('Front Squat')).not.toBeInTheDocument()
    expect(screen.queryByText('Push Press')).not.toBeInTheDocument()
  })

  it('shows an empty history message when a main lift has no saved TM entries', async () => {
    useTrainingMaxHistoryMock.mockReturnValue({
      data: [],
      isLoading: false,
    })

    const user = userEvent.setup()

    render(
      <TrainingMaxPanel description="Manage max-enabled training maxes from the new shared surface." />,
    )

    const customLiftCard = screen.getByText('Safety Squat Bar').closest('[data-slot="card"]')

    expect(customLiftCard).not.toBeNull()
    await user.click(within(customLiftCard as HTMLElement).getByRole('button', { name: 'History' }))

    expect(screen.getByText('No saved training max history exists for this lift yet.')).toBeInTheDocument()
  })

  it('shows the empty-state hint when no main lifts exist', () => {
    useExercisesMock.mockReturnValue({
      data: [
        {
          id: 11,
          name: 'Cable Fly',
          category: 'accessory',
          movement_pattern: 'push',
          is_main_lift: false,
          strength_lift_slug: null,
          created_at: null,
          created_by_user_id: null,
        },
      ],
      isLoading: false,
    })

    render(
      <TrainingMaxPanel description="Manage max-enabled training maxes from the new shared surface." />,
    )

    expect(screen.getByText('Add a TM-backed exercise block in Programs before setting a training max here.')).toBeInTheDocument()
  })

  it('switches to 1RM-first actions and dialog copy when the panel scope requires it', async () => {
    const user = userEvent.setup()

    render(
      <TrainingMaxPanel
        description="Manage required max inputs for the selected lifts."
        inputMode="1rm"
        targetExerciseIds={[10]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Update 1RM' }))

    expect(screen.getByRole('heading', { name: 'Set 1RM - Safety Squat Bar' })).toBeInTheDocument()
    expect(screen.getByLabelText('Estimated 1RM (lbs)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save 1RM' })).toBeInTheDocument()
  })

  it('treats TM percentage as percent points when saving from estimated 1RM', async () => {
    const user = userEvent.setup()

    render(
      <TrainingMaxPanel
        description="Manage required max inputs for the selected lifts."
        inputMode="1rm"
        targetExerciseIds={[10]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Update 1RM' }))

    fireEvent.change(screen.getByLabelText('Estimated 1RM (lbs)'), { target: { value: '300' } })
    fireEvent.change(screen.getByLabelText('TM Percentage'), { target: { value: '90' } })

    expect(screen.getByText('300 lbs x 90% = 270 lbs')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save 1RM' }))

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          exerciseId: 10,
          weightLbs: 270,
          tmPercentage: 0.9,
        }),
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      )
    })
  })

  it('does not render NaN when the TM percentage field is empty', async () => {
    const user = userEvent.setup()

    render(
      <TrainingMaxPanel
        description="Manage required max inputs for the selected lifts."
        inputMode="1rm"
        targetExerciseIds={[10]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Update 1RM' }))

    fireEvent.change(screen.getByLabelText('Estimated 1RM (lbs)'), { target: { value: '300' } })
    fireEvent.change(screen.getByLabelText('TM Percentage'), { target: { value: '' } })

    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
    expect(screen.getByText('Enter 50-100%')).toBeInTheDocument()
    expect(screen.queryByText('Calculated TM:')).not.toBeInTheDocument()
  })
})
