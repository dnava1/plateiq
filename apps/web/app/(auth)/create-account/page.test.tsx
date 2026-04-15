import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CreateAccountPage from './page'

const {
  signUpMock,
  useSearchParamsMock,
} = vi.hoisted(() => ({
  signUpMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => useSearchParamsMock(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: signUpMock,
    },
  }),
}))

describe('CreateAccountPage', () => {
  beforeEach(() => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams())
    signUpMock.mockReset()
  })

  it('starts public email account creation', async () => {
    const user = userEvent.setup()
    const origin = window.location.origin
    signUpMock.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    render(<CreateAccountPage />)

    await user.type(screen.getByLabelText('Email'), 'copilot.verify@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret-pass')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith({
        email: 'copilot.verify@example.com',
        password: 'secret-pass',
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=%2Fdashboard`,
        },
      })
    })

    expect(screen.getByText('Check your email to confirm your account.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })
})