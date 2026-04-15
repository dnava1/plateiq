import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from './page'

const { signInWithPasswordMock } = vi.hoisted(() => ({
  signInWithPasswordMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
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
      signInWithOAuth: vi.fn(),
      signInWithPassword: signInWithPasswordMock,
    },
  }),
}))

vi.mock('@/components/auth/TurnstileWidget', () => ({
  TurnstileWidget: ({ onTokenChange }: { onTokenChange: (token: string | null) => void }) => (
    <button type="button" onClick={() => onTokenChange('fresh-token')}>
      Solve challenge
    </button>
  ),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    signInWithPasswordMock.mockReset()
  })

  it('invalidates the email sign-in gate after a structured captcha rejection', async () => {
    const user = userEvent.setup()
    signInWithPasswordMock.mockResolvedValue({
      error: {
        code: 'captcha_failed',
        message: 'Unexpected captcha wording from Supabase',
        status: 400,
      },
    })

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'copilot.verify@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret-pass')
    fireEvent.click(screen.getByRole('button', { name: 'Solve challenge', hidden: true }))

    const signInButton = screen.getByRole('button', { name: 'Sign In' })
    expect(signInButton).toBeEnabled()

    await user.click(signInButton)

    await waitFor(() => {
      expect(screen.getByText('The last verification token was rejected. It has been reset. If Cloudflare asks for another challenge, complete it and try again.')).toBeInTheDocument()
    })

    expect(screen.getByText('Human verification expired or was already used. It has been reset. If Cloudflare asks for another challenge, complete it and try signing in one more time.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeDisabled()
  })
})
