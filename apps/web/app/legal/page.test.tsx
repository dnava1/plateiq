import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import LegalPage from './page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
}))

describe('LegalPage', () => {
  it('renders the canonical combined legal surface', () => {
    render(<LegalPage />)

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Terms & Privacy' })).toBeInTheDocument()
    expect(screen.getByText(/provided as-is and as-available/i)).toBeInTheDocument()
    expect(screen.getByText(/Google and Supabase/i)).toBeInTheDocument()
  })

  it('keeps the public legal controls clear of iOS safe areas', () => {
    render(<LegalPage />)

    expect(screen.getByRole('main')).toHaveClass('pt-[calc(env(safe-area-inset-top)+1rem)]')
    expect(screen.getByRole('main')).toHaveClass('pb-[calc(env(safe-area-inset-bottom)+2rem)]')
    expect(screen.getByRole('button', { name: 'Back' })).toHaveClass('h-11')
  })
})
