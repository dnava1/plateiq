import { useState, type ComponentProps } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TemplatePicker } from './TemplatePicker'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

function TemplatePickerHarness() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  return <TemplatePicker selectedKey={selectedKey} onSelect={setSelectedKey} />
}

describe('TemplatePicker', () => {
  it('renders human-readable template metadata and lift labels', () => {
    render(<TemplatePickerHarness />)

    expect(screen.queryByText(/3d\/wk/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/1wk cycle/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/3 days\/week|4 days\/week/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/lat_pulldown|barbell_row/i)).not.toBeInTheDocument()
    expect(screen.getAllByText('3 days per week').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1-week cycle').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Lifts:.*Lat Pulldown/i).length).toBeGreaterThan(0)
  })

  it('filters templates by search query and days per week', async () => {
    const user = userEvent.setup()

    render(<TemplatePickerHarness />)

    await user.click(screen.getByRole('button', { name: '4 days' }))

    expect(screen.queryByText(/StrongLifts/i)).not.toBeInTheDocument()
    expect(screen.getByText(/PHUL/i)).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: 'Search program templates' }), 'wendler')

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /Wendler's 5\/3\/1/i })).toBeInTheDocument()
    })

    expect(screen.queryByText(/PHUL/i)).not.toBeInTheDocument()
  })

  it('keeps selection on the card highlight without rendering a dot indicator', async () => {
    const user = userEvent.setup()

    render(<TemplatePickerHarness />)

    const templateCard = screen.getByRole('radio', { name: /StrongLifts/i })
    await user.click(templateCard)

    expect(templateCard).toHaveAttribute('aria-checked', 'true')
    expect(templateCard.querySelector('.size-3.rounded-full.bg-primary')).toBeNull()
    expect(screen.getByText(/Selected\. Setup opens below/i)).toBeInTheDocument()
  })

  it('expands inline template details from the info button', async () => {
    const user = userEvent.setup()

    render(<TemplatePickerHarness />)

    await user.click(screen.getByRole('button', { name: /Template details for Wendler's 5\/3\/1/i }))

    expect(screen.getByText('Weekly structure')).toBeInTheDocument()
    expect(screen.getByText('5s Week')).toBeInTheDocument()
    expect(screen.getByText('Variation notes')).toBeInTheDocument()
  })

  it('supports arrow-key navigation across template radios', async () => {
    const user = userEvent.setup()

    render(<TemplatePickerHarness />)

    const [firstTemplate, secondTemplate] = screen.getAllByRole('radio')

    await user.click(firstTemplate)
    expect(firstTemplate).toHaveAttribute('aria-checked', 'true')

    firstTemplate.focus()
    await user.keyboard('{ArrowDown}')

    await waitFor(() => {
      expect(secondTemplate).toHaveAttribute('aria-checked', 'true')
    })
  })

  it('exposes a single scratch builder entry instead of separate method cards', () => {
    render(<TemplatePickerHarness />)

    expect(screen.getByRole('link', { name: /Open Program Builder/i })).toHaveAttribute('href', '/programs/builder')
    expect(screen.queryByRole('link', { name: /Training-Max Driven/i })).not.toBeInTheDocument()
  })
})
