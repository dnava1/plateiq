import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OneRepMaxCalculator } from './OneRepMaxCalculator'

vi.mock('@/hooks/usePreferredUnit', () => ({
  usePreferredUnit: () => 'lbs',
}))

describe('OneRepMaxCalculator', () => {
  it('shows a single estimated 1RM result without formula or training max controls', async () => {
    const user = userEvent.setup()

    render(<OneRepMaxCalculator />)

    expect(screen.queryByText(/epley/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/brzycki/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/training max/i)).not.toBeInTheDocument()

    await user.type(screen.getByLabelText(/weight/i), '225')
    await user.type(screen.getByLabelText(/^reps$/i), '8')

    expect(screen.getByText('287.3 lbs')).toBeInTheDocument()
  })

  it('ignores fractional rep input', async () => {
    const user = userEvent.setup()

    render(<OneRepMaxCalculator />)

    await user.type(screen.getByLabelText(/weight/i), '225')
    await user.type(screen.getByLabelText(/^reps$/i), '8.5')

    expect(screen.queryByText('287.3 lbs')).not.toBeInTheDocument()
    expect(screen.getByText('Enter weight and reps')).toBeInTheDocument()
  })
})