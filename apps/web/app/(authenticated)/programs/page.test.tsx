import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProgramsPage from './page'

const mocks = vi.hoisted(() => ({
  useCurrentTrainingMaxes: vi.fn(),
  usePrograms: vi.fn(),
}))

vi.mock('@/hooks/usePrograms', () => ({
  usePrograms: () => mocks.usePrograms(),
}))

vi.mock('@/hooks/useTrainingMaxes', () => ({
  useCurrentTrainingMaxes: () => mocks.useCurrentTrainingMaxes(),
}))

vi.mock('@/components/programs/ProgramCard', () => ({
  ProgramCard: ({ program }: { program: { name: string } }) => <div>{program.name}</div>,
}))

vi.mock('@/components/programs/ProgramConfigForm', () => ({
  ProgramConfigForm: () => null,
}))

vi.mock('@/components/exercises/TrainingMaxPanel', () => ({
  TrainingMaxPanel: ({ title }: { title: string }) => <div>{title}</div>,
}))

function createProgram(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    user_id: 'user-1',
    name: 'Program',
    template_key: 'starting_strength',
    config: null,
    is_active: true,
    start_date: '2026-04-01',
    created_at: null,
    updated_at: null,
    ...overrides,
  }
}

describe('ProgramsPage', () => {
  beforeEach(() => {
    mocks.usePrograms.mockReturnValue({ data: [], isLoading: false })
    mocks.useCurrentTrainingMaxes.mockReturnValue({ data: [], isLoading: false })
  })

  it('shows a fallback TM panel when saved training maxes exist but no current program needs them', () => {
    mocks.usePrograms.mockReturnValue({
      data: [createProgram({ template_key: 'starting_strength' })],
      isLoading: false,
    })
    mocks.useCurrentTrainingMaxes.mockReturnValue({
      data: [{ id: 1, exercise_id: 10, weight_lbs: 315 }],
      isLoading: false,
    })

    render(<ProgramsPage />)

    expect(screen.getByText('Saved Training Maxes')).toBeInTheDocument()
  })

  it('hides the fallback TM panel when a visible program card already exposes TM access', () => {
    mocks.usePrograms.mockReturnValue({
      data: [createProgram({ template_key: 'texas_method' })],
      isLoading: false,
    })
    mocks.useCurrentTrainingMaxes.mockReturnValue({
      data: [{ id: 1, exercise_id: 10, weight_lbs: 315 }],
      isLoading: false,
    })

    render(<ProgramsPage />)

    expect(screen.queryByText('Saved Training Maxes')).not.toBeInTheDocument()
  })

  it('hides the fallback TM panel when an inactive program still exposes inline TM access', () => {
    mocks.usePrograms.mockReturnValue({
      data: [createProgram({ template_key: 'wendler_531', is_active: false, config: { variation_key: 'bbb', rounding: 5 } })],
      isLoading: false,
    })
    mocks.useCurrentTrainingMaxes.mockReturnValue({
      data: [{ id: 1, exercise_id: 10, weight_lbs: 315 }],
      isLoading: false,
    })

    render(<ProgramsPage />)

    expect(screen.queryByText('Saved Training Maxes')).not.toBeInTheDocument()
  })

  it('shows the fallback TM panel when there are no programs but saved training maxes still exist', () => {
    mocks.usePrograms.mockReturnValue({
      data: [],
      isLoading: false,
    })
    mocks.useCurrentTrainingMaxes.mockReturnValue({
      data: [{ id: 1, exercise_id: 10, weight_lbs: 315 }],
      isLoading: false,
    })

    render(<ProgramsPage />)

    expect(screen.getByText('Saved Training Maxes')).toBeInTheDocument()
  })

  it('waits for the programs query to resolve before showing the fallback TM panel', () => {
    mocks.usePrograms.mockReturnValue({
      data: undefined,
      isLoading: true,
    })
    mocks.useCurrentTrainingMaxes.mockReturnValue({
      data: [{ id: 1, exercise_id: 10, weight_lbs: 315 }],
      isLoading: false,
    })

    render(<ProgramsPage />)

    expect(screen.queryByText('Saved Training Maxes')).not.toBeInTheDocument()
  })

  it('waits for the training max query to resolve before showing the fallback TM panel', () => {
    mocks.usePrograms.mockReturnValue({
      data: [createProgram({ template_key: 'starting_strength' })],
      isLoading: false,
    })
    mocks.useCurrentTrainingMaxes.mockReturnValue({
      data: [{ id: 1, exercise_id: 10, weight_lbs: 315 }],
      isLoading: true,
    })

    render(<ProgramsPage />)

    expect(screen.queryByText('Saved Training Maxes')).not.toBeInTheDocument()
  })
})