import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('normalizes RIR input into canonical RPE before submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <SetEntry
        defaultReps={8}
        defaultWeightLbs={185}
        onCancel={() => {}}
        onSubmit={onSubmit}
        prescribedRpe={8}
      />,
    )

    expect(screen.getByText('Target RPE 8')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'RIR' }))
    await user.type(screen.getByLabelText(/actual effort/i), '2')
    await user.click(screen.getByRole('button', { name: /save set/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        actualRpe: 8,
        reps: 8,
      }),
    )
    expect(onSubmit.mock.calls[0]?.[0].weightLbs).toBeCloseTo(181.88, 2)
  })
})