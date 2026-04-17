import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SetEntry } from './SetEntry'

vi.mock('@/hooks/usePreferredUnit', () => ({
  usePreferredUnit: () => 'kg',
}))

vi.mock('@/hooks/usePreferredWeightRounding', () => ({
  usePreferredWeightRounding: () => 5.51156,
}))

describe('SetEntry', () => {
  it('seeds the load input from the rounded display value and omits redundant suggested-load copy', () => {
    render(
      <SetEntry
        defaultReps={10}
        defaultWeightLbs={95}
        onCancel={() => {}}
        onSubmit={() => {}}
      />,
    )

    expect(screen.getByLabelText(/load \(kg\)/i)).toHaveValue(42.5)
    expect(screen.queryByText(/suggested load/i)).not.toBeInTheDocument()
  })
})