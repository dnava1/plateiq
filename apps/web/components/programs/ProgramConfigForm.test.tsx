import { type ComponentProps } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  })

  it('shows only extra template context in the lower detail card', async () => {
    const user = userEvent.setup()

    render(<ProgramConfigForm open onOpenChange={vi.fn()} />)

    const templateTitle = screen.getByText("Wendler's 5/3/1")
    const templateCard = templateTitle.closest('[role="radio"]')
    expect(templateCard).not.toBeNull()

    await user.click(templateCard as HTMLElement)

    const detailCard = screen.getByText('Template details').closest('[data-slot="card-content"]')
    expect(detailCard).not.toBeNull()

    const detailPanel = within(detailCard as HTMLElement)

    expect(detailPanel.getByText('Required lifts')).toBeInTheDocument()
    expect(detailPanel.getByText('Weekly structure')).toBeInTheDocument()
    expect(detailPanel.getByText('Available variations')).toBeInTheDocument()
    expect(detailPanel.getByText(/Training max default 90%/i)).toBeInTheDocument()
    expect(detailPanel.getByText(/Bench Press/)).toBeInTheDocument()
    expect(detailPanel.queryByText(/Wendler's 5\/3\/1/i)).not.toBeInTheDocument()
    expect(detailPanel.queryByText(/Jim Wendler's 5\/3\/1 program/i)).not.toBeInTheDocument()
  })

  it('routes the selected template into the builder with the active setup values', async () => {
    const user = userEvent.setup()

    render(<ProgramConfigForm open onOpenChange={vi.fn()} />)

    await user.click(screen.getByText("Wendler's 5/3/1"))
    const variationOption = screen.getAllByText('Boring But Big (BBB)')[1]
    await user.click(variationOption as HTMLElement)
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

  it('exposes method-first scratch builder entry links', () => {
    render(<ProgramConfigForm open onOpenChange={vi.fn()} />)

    const generalLink = screen.getByRole('link', { name: /General Program/i })
    const trainingMaxLink = screen.getByRole('link', { name: /Training-Max Driven/i })

    expect(generalLink).toHaveAttribute('href', '/programs/builder?method=general')
    expect(trainingMaxLink).toHaveAttribute('href', '/programs/builder?method=tm_driven')
  })
})