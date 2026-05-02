import { useEffect } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ContinuePage from './page'

const { autoRefreshOnResetMock, signInAnonymouslyMock, useSearchParamsMock } = vi.hoisted(() => ({
  autoRefreshOnResetMock: vi.fn(() => true),
  signInAnonymouslyMock: vi.fn(),
  useSearchParamsMock: vi.fn(() => new URLSearchParams()),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => useSearchParamsMock(),
}))

vi.mock('@/lib/auth/captcha', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/captcha')>('@/lib/auth/captcha')

  return {
    ...actual,
    turnstileSiteKey: 'test-turnstile-site-key',
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInAnonymously: signInAnonymouslyMock,
      signInWithOAuth: vi.fn(),
    },
  }),
}))

vi.mock('@/components/auth/TurnstileWidget', () => ({
  TurnstileWidget: ({
    onTokenChange,
    resetKey = 0,
  }: {
    onTokenChange: (token: string | null) => void
    resetKey?: number
  }) => {
    useEffect(() => {
      if (resetKey > 0 && autoRefreshOnResetMock()) {
        onTokenChange('fresh-token-after-reset')
      }
    }, [onTokenChange, resetKey])

    return (
      <button type="button" onClick={() => onTokenChange('fresh-token')}>
        Solve challenge
      </button>
    )
  },
}))

describe('ContinuePage', () => {
  beforeEach(() => {
    autoRefreshOnResetMock.mockReset()
    autoRefreshOnResetMock.mockReturnValue(true)
    signInAnonymouslyMock.mockReset()
    useSearchParamsMock.mockReturnValue(new URLSearchParams())
  })

  it('shows a visible guest verification status while the button is waiting on Cloudflare', () => {
    render(<ContinuePage />)

    expect(screen.getByRole('button', { name: 'Continue as Guest' })).toBeDisabled()
    expect(screen.getByText('Preparing human verification')).toBeInTheDocument()
  })

  it('keeps the button in loading state after a successful guest sign-in', async () => {
    const user = userEvent.setup()
    signInAnonymouslyMock.mockResolvedValue({ error: null })

    render(<ContinuePage />)

    fireEvent.click(screen.getByRole('button', { name: 'Solve challenge', hidden: true }))
    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))

    await waitFor(() => {
      expect(signInAnonymouslyMock).toHaveBeenCalled()
    })

    // After a successful sign-in the button must stay in its loading label
    // until navigation completes — it should never flash back to the idle text.
    expect(screen.getByRole('button', { name: 'Starting guest session…' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue as Guest' })).not.toBeInTheDocument()
  })

  it('shows Google sign-in failure feedback from the callback redirect', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('error=auth_failed'))

    render(<ContinuePage />)

    expect(screen.getByText('We could not complete that Google sign-in attempt. Try guest mode or Google again.')).toBeInTheDocument()
  })

  it('invalidates the guest gate after a structured captcha rejection', async () => {
    const user = userEvent.setup()
    signInAnonymouslyMock.mockResolvedValue({
      error: {
        code: 'captcha_failed',
        message: 'Some unexpected auth wording',
        status: 400,
      },
    })

    render(<ContinuePage />)

    fireEvent.click(screen.getByRole('button', { name: 'Solve challenge', hidden: true }))

    const guestButton = screen.getByRole('button', { name: 'Continue as Guest' })
    expect(guestButton).toBeEnabled()

    await user.click(guestButton)

    await waitFor(() => {
      expect(signInAnonymouslyMock).toHaveBeenCalledWith({
        options: {
          captchaToken: 'fresh-token',
        },
      })
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Continue as Guest' })).toBeEnabled()
    })

    expect(screen.queryByText('The last verification token was rejected. It has been reset. If Cloudflare asks for another challenge, complete it and try again.')).not.toBeInTheDocument()
    expect(screen.queryByText('Human verification expired or was already used. It has been reset. If Cloudflare asks for another challenge, complete it and try guest mode again.')).not.toBeInTheDocument()
  })

  it('shows neutral verification status while waiting for a fresh guest challenge after reset', async () => {
    const user = userEvent.setup()
    autoRefreshOnResetMock.mockReturnValue(false)
    signInAnonymouslyMock.mockResolvedValue({
      error: {
        code: 'captcha_failed',
        message: 'Some unexpected auth wording',
        status: 400,
      },
    })

    render(<ContinuePage />)

    fireEvent.click(screen.getByRole('button', { name: 'Solve challenge', hidden: true }))

    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Continue as Guest' })).toBeDisabled()
    })

    expect(screen.queryByText('The last verification token was rejected. It has been reset. If Cloudflare asks for another challenge, complete it and try again.')).not.toBeInTheDocument()
    expect(screen.queryByText('Human verification expired or was already used. It has been reset. If Cloudflare asks for another challenge, complete it and try guest mode again.')).not.toBeInTheDocument()
    expect(screen.getByText('Preparing human verification')).toBeInTheDocument()
  })

  it('shows a localhost configuration hint when Supabase rejects the token as invalid input', async () => {
    const user = userEvent.setup()
    autoRefreshOnResetMock.mockReturnValue(false)
    signInAnonymouslyMock.mockResolvedValue({
      error: {
        code: 'captcha_failed',
        message: 'captcha protection: request disallowed (invalid-input-response)',
        status: 400,
      },
    })

    render(<ContinuePage />)

    fireEvent.click(screen.getByRole('button', { name: 'Solve challenge', hidden: true }))
    await user.click(screen.getByRole('button', { name: 'Continue as Guest' }))

    await waitFor(() => {
      expect(screen.getByText('Local guest verification is misconfigured. Check that Supabase CAPTCHA uses the secret for this Cloudflare site key and that localhost is allowed in the Turnstile widget.')).toBeInTheDocument()
    })
  })
})
