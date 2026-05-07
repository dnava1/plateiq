import { type ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProgramConfigForm } from './ProgramConfigForm'

const pushMock = vi.fn()
const mutateMock = vi.fn()
const useExercisesMock = vi.fn()
const useCurrentTrainingMaxesMock = vi.fn()

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock('@/hooks/usePreferredUnit', () => ({
  usePreferredUnit: () => 'lbs',
}))

vi.mock('@/hooks/useExercises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useExercises')>()
  return {
    ...actual,
    useExercises: () => useExercisesMock(),
  }
})

vi.mock('@/hooks/usePrograms', () => ({
  useCreateProgram: () => ({
    isPending: false,
    mutate: mutateMock,
  }),
}))

vi.mock('@/hooks/useTrainingMaxes', () => ({
  useCurrentTrainingMaxes: () => useCurrentTrainingMaxesMock(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('ProgramConfigForm', () => {
  beforeEach(() => {
    pushMock.mockReset()
    mutateMock.mockReset()
    useExercisesMock.mockReset()
    useCurrentTrainingMaxesMock.mockReset()
    useExercisesMock.mockReturnValue({ data: [], isLoading: false })
    useCurrentTrainingMaxesMock.mockReturnValue({ data: [], isLoading: false })
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 0
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const getWendlerTemplateCard = () =>
    screen.getAllByRole('radio').find((radio) => radio.textContent?.startsWith("Wendler's 5/3/1"))

  it('scrolls into the selected-template setup and removes the separate details card', async () => {
    const user = userEvent.setup()

    render(<ProgramConfigForm open onOpenChange={vi.fn()} />)

    const wendlerTemplateCard = getWendlerTemplateCard()

    expect(wendlerTemplateCard).toBeDefined()
    await user.click(wendlerTemplateCard!)

    expect(await screen.findByDisplayValue("Wendler's 5/3/1")).toBeInTheDocument()
    expect(screen.getByText('Selected template')).toBeInTheDocument()
    expect(screen.queryByText('Template details')).not.toBeInTheDocument()
  })

  it('routes the selected template into the builder with the active setup values', async () => {
    const user = userEvent.setup()

    render(<ProgramConfigForm open onOpenChange={vi.fn()} />)

    const wendlerTemplateCard = getWendlerTemplateCard()

    expect(wendlerTemplateCard).toBeDefined()
    await user.click(wendlerTemplateCard!)
    await user.click(screen.getByRole('radio', { name: /Boring But Big \(BBB\)/i }))
    await user.click(screen.getByRole('button', { name: 'Customize in Builder' }))

    expect(pushMock).toHaveBeenCalledTimes(1)

    const target = pushMock.mock.calls[0][0] as string
    const url = new URL(target, 'http://localhost')

    expect(url.pathname).toBe('/programs/builder')
    expect(url.searchParams.get('template')).toBe('wendler_531')
    expect(url.searchParams.get('variation')).toBe('bbb')
    expect(url.searchParams.get('name')).toBe("Wendler's 5/3/1")
    expect(url.searchParams.get('tm')).toBe('0.9')
    expect(url.searchParams.get('rounding')).toBeNull()
  })

  it('exposes a single scratch builder entry instead of separate method links', () => {
    render(<ProgramConfigForm open onOpenChange={vi.fn()} />)

    expect(screen.getByRole('link', { name: /Open Program Builder/i })).toHaveAttribute('href', '/programs/builder')
    expect(screen.queryByRole('link', { name: /Training-Max Driven/i })).not.toBeInTheDocument()
  })

  it('requires the relevant training maxes before a TM-backed template can be created', async () => {
    const user = userEvent.setup()

    useExercisesMock.mockReturnValue({
      data: [
        { id: 1, name: 'Squat', analytics_track: 'standard', created_by_user_id: null },
        { id: 2, name: 'Bench Press', analytics_track: 'standard', created_by_user_id: null },
        { id: 3, name: 'Overhead Press', analytics_track: 'standard', created_by_user_id: null },
        { id: 4, name: 'Deadlift', analytics_track: 'standard', created_by_user_id: null },
      ],
      isLoading: false,
    })

    render(<ProgramConfigForm open onOpenChange={vi.fn()} />)

    const wendlerTemplateCard = getWendlerTemplateCard()

    expect(wendlerTemplateCard).toBeDefined()
    await user.click(wendlerTemplateCard!)

    expect(screen.getByText('Required Training Maxes')).toBeInTheDocument()
    const gateMessage = screen.getByText(/Set current training maxes for/i)
    expect(gateMessage).toHaveTextContent('Squat')
    expect(gateMessage).toHaveTextContent('Bench Press')
    expect(gateMessage).toHaveTextContent('Overhead Press')
    expect(gateMessage).toHaveTextContent('Deadlift')
    expect(screen.getByRole('button', { name: 'Create Program' })).toBeDisabled()
  })

  it('enables creation once the required training maxes already exist', async () => {
    const user = userEvent.setup()

    useExercisesMock.mockReturnValue({
      data: [
        { id: 1, name: 'Squat', analytics_track: 'standard', created_by_user_id: null },
        { id: 2, name: 'Bench Press', analytics_track: 'standard', created_by_user_id: null },
        { id: 3, name: 'Overhead Press', analytics_track: 'standard', created_by_user_id: null },
        { id: 4, name: 'Deadlift', analytics_track: 'standard', created_by_user_id: null },
      ],
      isLoading: false,
    })
    useCurrentTrainingMaxesMock.mockReturnValue({
      data: [
        { exercise_id: 1, weight_lbs: 225 },
        { exercise_id: 2, weight_lbs: 185 },
        { exercise_id: 3, weight_lbs: 135 },
        { exercise_id: 4, weight_lbs: 315 },
      ],
      isLoading: false,
    })

    render(<ProgramConfigForm open onOpenChange={vi.fn()} />)

    const wendlerTemplateCard = getWendlerTemplateCard()

    expect(wendlerTemplateCard).toBeDefined()
    await user.click(wendlerTemplateCard!)

    expect(screen.getByText('All required training maxes are set for this program.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Program' })).toBeEnabled()
  })
})
