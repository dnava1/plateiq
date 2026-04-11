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
})