import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { TrainingMaxPanel } from './TrainingMaxPanel'

const useExercisesMock = vi.fn()
const useCurrentTrainingMaxesMock = vi.fn()
const useTrainingMaxHistoryMock = vi.fn()
const mutateMock = vi.fn()

vi.mock('@/hooks/useExercises', () => ({
  useExercises: () => useExercisesMock(),
}))

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
      <TrainingMaxPanel description="Manage main-lift training maxes from the new shared surface." />,
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

    expect(screen.getByRole('heading', { name: 'Set Training Max — Safety Squat Bar' })).toBeInTheDocument()

    const tmInput = screen.getByLabelText('Training Max (lbs)')
    await user.clear(tmInput)
    await user.type(tmInput, '320')
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

  it('shows an empty history message when a main lift has no saved TM entries', async () => {
    useTrainingMaxHistoryMock.mockReturnValue({
      data: [],
      isLoading: false,
    })

    const user = userEvent.setup()

    render(
      <TrainingMaxPanel description="Manage main-lift training maxes from the new shared surface." />,
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
      <TrainingMaxPanel description="Manage main-lift training maxes from the new shared surface." />,
    )

    expect(screen.getByText('Create a main lift in Programs before setting a training max here.')).toBeInTheDocument()
  })
})