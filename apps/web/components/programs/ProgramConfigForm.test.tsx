import { type ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProgramConfigForm } from './ProgramConfigForm'

const pushMock = vi.fn()

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

vi.mock('@/hooks/usePrograms', () => ({
  useCreateProgram: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
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
})
