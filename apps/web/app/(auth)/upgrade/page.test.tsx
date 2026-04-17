import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UpgradePage from './page'

const {
  linkIdentityMock,
  signInWithOAuthMock,
  signOutMock,
  useSearchParamsMock,
  useUserMock,
} = vi.hoisted(() => ({
  linkIdentityMock: vi.fn(),
  signInWithOAuthMock: vi.fn(),
  signOutMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  useUserMock: vi.fn(),
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
  useUser: () => useUserMock(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      linkIdentity: linkIdentityMock,
      signInWithOAuth: signInWithOAuthMock,
      signOut: signOutMock,
    },
  }),
}))

describe('UpgradePage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    window.history.replaceState({}, '', '/upgrade')
    useSearchParamsMock.mockReturnValue(new URLSearchParams())
    useUserMock.mockReturnValue({
      data: {
        id: 'guest-user',
        is_anonymous: true,
        email: 'guest@example.com',
      },
      isLoading: false,
    })
    linkIdentityMock.mockReset()
    signInWithOAuthMock.mockReset()
    signOutMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows Google connection failure feedback from the callback redirect', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('error=auth_failed'))

    render(<UpgradePage />)

    expect(screen.getByText('We could not complete that Google sign-in. Try again.')).toBeInTheDocument()
  })

  it('keeps the upgrade CTA visible while account data resolves', () => {
    useUserMock.mockReturnValue({
      data: null,
      isLoading: true,
    })

    render(<UpgradePage />)

    expect(screen.queryByText('Loading account details…')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In with Google' })).toBeDisabled()
  })

  it('shows redirecting state immediately when existing-account retry mode loads', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('upgrade_mode=existing_google'))
    useUserMock.mockReturnValue({
      data: null,
      isLoading: true,
    })

    render(<UpgradePage />)

    expect(screen.getByRole('button', { name: 'Redirecting to Google…' })).toBeDisabled()
    expect(screen.getByText('Sign in with Google to keep this temporary guest session and continue with a permanent account.')).toBeInTheDocument()
  })

  it('falls back to the unavailable state when retry mode loads without a guest session', async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('upgrade_mode=existing_google'))
    useUserMock.mockReturnValue({
      data: null,
      isLoading: false,
    })

    render(<UpgradePage />)

    await waitFor(() => {
      expect(screen.getByText('Google sign-in unavailable')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Redirecting to Google…' })).not.toBeInTheDocument()
  })

  it('clears retry loading state when retry mode resolves to a permanent user', async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('upgrade_mode=existing_google'))
    useUserMock.mockReturnValue({
      data: {
        id: 'permanent-user',
        is_anonymous: false,
        email: 'member@example.com',
      },
      isLoading: false,
    })

    render(<UpgradePage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign In with Google' })).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Redirecting to Google…' })).not.toBeInTheDocument()
  })

  it('retries as a normal Google sign-in when the provider reports identity_already_exists', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    signInWithOAuthMock.mockResolvedValue({ error: null })
    useSearchParamsMock.mockReturnValue(new URLSearchParams('upgrade_mode=existing_google'))
    window.history.replaceState({}, '', '/upgrade?upgrade_mode=existing_google')
    const origin = window.location.origin

    render(<UpgradePage />)

    expect(screen.queryByText('We could not complete that Google sign-in. Try again.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Redirecting to Google…' })).toBeDisabled()
    expect(screen.getByText('Sign in with Google to keep this temporary guest session and continue with a permanent account.')).toBeInTheDocument()

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/upgrade/discard', {
        method: 'POST',
      })
    })

    await waitFor(() => {
      expect(signInWithOAuthMock).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=%2Fsettings&upgrade_mode=existing_google`,
        },
      })
    })

    expect(signOutMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Redirecting to Google…' })).toBeInTheDocument()
  })

  it('clears the prepared cleanup cookie when existing-account retry cannot start', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    signInWithOAuthMock.mockResolvedValue({ error: { message: 'oauth failed' } })
    useSearchParamsMock.mockReturnValue(new URLSearchParams('upgrade_mode=existing_google'))
    window.history.replaceState({}, '', '/upgrade?upgrade_mode=existing_google')

    render(<UpgradePage />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/upgrade/discard', {
        method: 'POST',
      })
    })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/upgrade/discard', {
        method: 'DELETE',
      })
    })

    expect(screen.getByText('Unable to switch to your existing Google account right now.')).toBeInTheDocument()
    expect(signOutMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Sign In with Google' })).toBeEnabled()
  })

  it('starts Google account creation from the guest session', async () => {
    const user = userEvent.setup()
    linkIdentityMock.mockResolvedValue({ error: null })
    const origin = window.location.origin

    render(<UpgradePage />)

    await user.click(screen.getByRole('button', { name: 'Sign In with Google' }))

    await waitFor(() => {
      expect(linkIdentityMock).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=%2Fsettings`,
        },
      })
    })

    expect(screen.getByRole('button', { name: 'Redirecting to Google…' })).toBeInTheDocument()
  })
})
