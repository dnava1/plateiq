import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuthTurnstileGate } from './AuthTurnstileGate'

vi.mock('@/components/auth/TurnstileWidget', () => ({
  TurnstileWidget: ({
    onTokenChange,
    onBeforeInteractive,
    onAfterInteractive,
    onWidgetError,
  }: {
    onTokenChange: (token: string | null) => void
    onBeforeInteractive?: () => void
    onAfterInteractive?: () => void
    onWidgetError?: (message: string) => void
  }) => (
    <div>
      <button type="button" onClick={() => onBeforeInteractive?.()}>
        Require interaction
      </button>
      <button
        type="button"
        onClick={() => {
          onTokenChange('fresh-token')
          onAfterInteractive?.()
        }}
      >
        Solve challenge
      </button>
      <button type="button" onClick={() => onWidgetError?.('Widget failed hard')}>
        Trigger widget error
      </button>
    </div>
  ),
}))

describe('AuthTurnstileGate', () => {
  it('moves from checking to verified and resets after invalidation', async () => {
    const user = userEvent.setup()

    render(
      <AuthTurnstileGate
        action="email_sign_in"
        actionLabel="email sign-in"
        siteKey="site-key"
        unavailableText="Email sign-in is unavailable."
      >
        {({ canProceed, invalidate, statusId }) => (
          <button type="button" disabled={!canProceed} aria-describedby={statusId} onClick={() => invalidate()}>
            Submit
          </button>
        )}
      </AuthTurnstileGate>,
    )

    expect(screen.getByText('Preparing human verification')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Require interaction' }))
    expect(screen.getByText('Complete the human verification challenge to continue.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Solve challenge' }))
    expect(screen.getByText('Human verification is ready for email sign-in.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByText('The last verification token was rejected. It has been reset. If Cloudflare asks for another challenge, complete it and try again.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled()
  })

  it('shows widget errors in the shared status row', async () => {
    const user = userEvent.setup()

    render(
      <AuthTurnstileGate
        action="guest_entry"
        actionLabel="guest entry"
        siteKey="site-key"
        unavailableText="Guest mode is unavailable."
        presentation="minimal"
      >
        {({ canProceed }) => <button type="button" disabled={!canProceed}>Continue</button>}
      </AuthTurnstileGate>,
    )

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Preparing human verification')
    expect(status.className).not.toContain('sr-only')

    await user.click(screen.getByRole('button', { name: 'Trigger widget error' }))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Widget failed hard')
    expect(alert.className).not.toContain('sr-only')
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })
})
