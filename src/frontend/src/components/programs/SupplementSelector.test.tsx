import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SupplementSelector } from './SupplementSelector'

const options = [
  {
    key: 'bbb',
    name: 'Boring But Big (BBB)',
    description: '5 sets × 10 reps @ 50% TM of the main lift',
    blocks: [],
  },
  {
    key: 'fsl',
    name: 'First Set Last (FSL)',
    description: '5 sets × 5 reps at the first working set weight',
    blocks: [],
  },
]

function SupplementSelectorHarness() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  return <SupplementSelector options={options} selectedKey={selectedKey} onSelect={setSelectedKey} />
}

describe('SupplementSelector', () => {
  it('supports arrow-key navigation across supplement radios', async () => {
    const user = userEvent.setup()

    render(<SupplementSelectorHarness />)

    const baseOption = screen.getByRole('radio', { name: /Base template only/i })
    const bbbOption = screen.getByRole('radio', { name: /Boring But Big/i })

    await user.click(baseOption)
    expect(baseOption).toHaveAttribute('aria-checked', 'true')

    baseOption.focus()
    await user.keyboard('{ArrowDown}')

    await waitFor(() => {
      expect(bbbOption).toHaveAttribute('aria-checked', 'true')
    })
  })
})