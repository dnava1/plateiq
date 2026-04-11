import { type ComponentProps } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProgramConfigForm } from './ProgramConfigForm'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
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
})