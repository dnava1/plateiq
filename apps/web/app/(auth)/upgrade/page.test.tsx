import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UpgradePage from './page'

const {
  linkIdentityMock,
  updateUserMock,
  useSearchParamsMock,
} = vi.hoisted(() => ({
  linkIdentityMock: vi.fn(),
  updateUserMock: vi.fn(),
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

vi.mock('@/hooks/useUser', () => ({
  useUser: () => ({
    data: {
      id: 'guest-user',
      is_anonymous: true,
      email: 'guest@example.com',
    },
    isLoading: false,
  }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      linkIdentity: linkIdentityMock,
      updateUser: updateUserMock,
    },
  }),
}))

describe('UpgradePage', () => {
  beforeEach(() => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams())
    linkIdentityMock.mockReset()
    updateUserMock.mockReset()
  })

  it('starts email account creation and shows the sign-in fallback link', async () => {
    const user = userEvent.setup()
    updateUserMock.mockResolvedValue({ error: null })
    const origin = window.location.origin

    render(<UpgradePage />)

    await user.type(screen.getByLabelText('Email'), 'copilot.verify@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret-pass')
    await user.click(screen.getByRole('button', { name: 'Create Account with Email' }))

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith(
        { email: 'copilot.verify@example.com', password: 'secret-pass' },
        {
          emailRedirectTo: `${origin}/auth/callback?next=%2Fsettings%3Fupgraded%3D1`,
        },
      )
    })

    expect(screen.getByText('Check your email to confirm your account.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })

  it('starts Google account creation from the guest session', async () => {
    const user = userEvent.setup()
    linkIdentityMock.mockResolvedValue({ error: null })
    const origin = window.location.origin

    render(<UpgradePage />)

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))

    await waitFor(() => {
      expect(linkIdentityMock).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=%2Fsettings%3Fupgraded%3D1`,
        },
      })
    })

    expect(screen.getByRole('button', { name: 'Redirecting to Google…' })).toBeInTheDocument()
  })
})
