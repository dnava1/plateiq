import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { displayToLbs } from '@/lib/utils'
import { PlateBreakdownInline } from './PlateBreakdownInline'

const mocks = vi.hoisted(() => ({
  preferredUnit: 'kg' as 'kg' | 'lbs',
  weightRoundingLbs: 5.51156,
}))

vi.mock('@/hooks/usePreferredUnit', () => ({
  usePreferredUnit: () => mocks.preferredUnit,
}))

vi.mock('@/hooks/usePreferredWeightRounding', () => ({
  usePreferredWeightRounding: () => mocks.weightRoundingLbs,
}))

describe('PlateBreakdownInline', () => {
  it('renders real metric plates for metric workout loads', async () => {
    const user = userEvent.setup()
    mocks.preferredUnit = 'kg'
    mocks.weightRoundingLbs = 5.51156

    render(<PlateBreakdownInline weightsLbs={[displayToLbs(45, 'kg')]} />)

    await user.click(screen.getByRole('button', { name: /show plates/i }))

    expect(screen.getByText('1×10kg')).toBeInTheDocument()
    expect(screen.getByText('1×2.5kg')).toBeInTheDocument()
    expect(screen.queryByText('1×11.3kg')).not.toBeInTheDocument()
    expect(screen.queryByText('1×1.1kg')).not.toBeInTheDocument()
  })

  it('renders 0.5 kg change plates when the user rounds in 1 kg increments', async () => {
    const user = userEvent.setup()
    mocks.preferredUnit = 'kg'
    mocks.weightRoundingLbs = 2.20462

    render(<PlateBreakdownInline weightsLbs={[displayToLbs(41, 'kg')]} />)

    await user.click(screen.getByRole('button', { name: /show plates/i }))

    expect(screen.getByText('1×10kg')).toBeInTheDocument()
    expect(screen.getByText('1×0.5kg')).toBeInTheDocument()
  })

  it('snaps stale pound-based rounding values back to kilogram increments', async () => {
    const user = userEvent.setup()
    mocks.preferredUnit = 'kg'
    mocks.weightRoundingLbs = 5

    render(<PlateBreakdownInline weightsLbs={[displayToLbs(45, 'kg')]} />)

    await user.click(screen.getByRole('button', { name: /show plates/i }))

    expect(screen.getByText('45 kg')).toBeInTheDocument()
    expect(screen.getByText('1×10kg')).toBeInTheDocument()
    expect(screen.getByText('1×2.5kg')).toBeInTheDocument()
    expect(screen.queryByText('45.4 kg')).not.toBeInTheDocument()
  })

  it('renders exact low-load metric stacks instead of underloading them', async () => {
    const user = userEvent.setup()
    mocks.preferredUnit = 'kg'
    mocks.weightRoundingLbs = 2.20462

    render(<PlateBreakdownInline weightsLbs={[displayToLbs(23, 'kg')]} />)

    await user.click(screen.getByRole('button', { name: /show plates/i }))

    expect(screen.getByText('23 kg')).toBeInTheDocument()
    expect(screen.getByText('3×0.5kg')).toBeInTheDocument()
    expect(screen.queryByText('1×1.25kg')).not.toBeInTheDocument()
  })

  it('renders 1.25 lb change plates for 47.5 lb targets in pound mode', async () => {
    const user = userEvent.setup()
    mocks.preferredUnit = 'lbs'
    mocks.weightRoundingLbs = 2.5

    render(<PlateBreakdownInline weightsLbs={[47.5]} />)

    await user.click(screen.getByRole('button', { name: /show plates/i }))

    expect(screen.getByText('47.5 lbs')).toBeInTheDocument()
    expect(screen.getByText('1×1.25lbs')).toBeInTheDocument()
  })
})