import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Loading from './loading'

describe('Authenticated loading state', () => {
  it('shows a branded status message while the app shell is loading', () => {
    render(<Loading />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('PlateIQ')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Opening PlateIQ' })).toBeInTheDocument()
    expect(screen.getByText('Restoring your training data and reconnecting your latest workout state.')).toBeInTheDocument()
  })
})