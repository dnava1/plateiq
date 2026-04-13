import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UpgradePage from './page'

const {
  finalizePendingGuestMergeClientMock,
  flushPendingMutationsMock,
  prepareGuestMergeClientMock,
  signInWithPasswordMock,
} = vi.hoisted(() => ({
  finalizePendingGuestMergeClientMock: vi.fn(async () => undefined),
  flushPendingMutationsMock: vi.fn(async () => 0),
  prepareGuestMergeClientMock: vi.fn(async () => undefined),
  signInWithPasswordMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({}),
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

vi.mock('@/lib/query-persistence', () => ({
  flushPendingMutations: flushPendingMutationsMock,
}))

vi.mock('@/lib/auth/captcha', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/captcha')>('@/lib/auth/captcha')

  return {
    ...actual,
    turnstileSiteKey: 'test-turnstile-site-key',
  }
})

vi.mock('@/lib/auth/merge-client', () => ({
  clearPendingGuestMergeClient: vi.fn(async () => undefined),
  finalizePendingGuestMergeClient: finalizePendingGuestMergeClientMock,
  prepareGuestMergeClient: prepareGuestMergeClientMock,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      linkIdentity: vi.fn(),
      signInWithOAuth: vi.fn(),
      signInWithPassword: signInWithPasswordMock,
      updateUser: vi.fn(),
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

describe('UpgradePage', () => {
  beforeEach(() => {
    finalizePendingGuestMergeClientMock.mockClear()
    flushPendingMutationsMock.mockClear()
    prepareGuestMergeClientMock.mockClear()
    signInWithPasswordMock.mockReset()
  })

  it('invalidates the merge sign-in gate after a structured captcha rejection', async () => {
    const user = userEvent.setup()
    signInWithPasswordMock.mockResolvedValue({
      error: {
        code: 'captcha_failed',
        message: 'Different captcha failure wording',
        status: 400,
      },
    })

    render(<UpgradePage />)

    await user.type(screen.getByLabelText('Existing account email'), 'copilot.verify@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret-pass')
    fireEvent.click(screen.getByRole('button', { name: 'Solve challenge', hidden: true }))

    const mergeButton = screen.getByRole('button', { name: 'Merge into Existing Account' })
    expect(mergeButton).toBeEnabled()

    await user.click(mergeButton)

    await waitFor(() => {
      expect(screen.getByText('The last verification token was rejected. It has been reset. If Cloudflare asks for another challenge, complete it and try again.')).toBeInTheDocument()
    })

    expect(screen.getByText('Human verification expired or was already used. It has been reset. If Cloudflare asks for another challenge, complete it and retry the merge sign-in.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Merge into Existing Account' })).toBeDisabled()
  })
})
