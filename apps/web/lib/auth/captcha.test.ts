import { describe, expect, it } from 'vitest'
import {
  getCaptchaFeedbackMessage,
  isCaptchaRejectionError,
  isCaptchaRejectionMessage,
  isInvalidCaptchaResponseError,
} from './captcha'

describe('captcha helpers', () => {
  it('classifies backend verification failures', () => {
    expect(isCaptchaRejectionMessage('captcha protection: request disallowed (invalid-input-response)')).toBe(true)
    expect(isCaptchaRejectionMessage('Human verification failed because the token expired.')).toBe(true)
    expect(isCaptchaRejectionMessage('Turnstile token has already been used.')).toBe(true)
  })

  it('does not treat normal credential failures as captcha failures', () => {
    expect(isCaptchaRejectionMessage('Invalid login credentials')).toBe(false)
  })

  it('prefers structured Supabase auth error fields when available', () => {
    expect(
      isCaptchaRejectionError({
        code: 'captcha_failed',
        message: 'Unexpected wording from the backend',
        status: 400,
      }),
    ).toBe(true)

    expect(
      isCaptchaRejectionError({
        code: 'invalid_credentials',
        message: 'Invalid login credentials',
        status: 400,
      }),
    ).toBe(false)
  })

  it('detects invalid captcha responses separately from normal duplicate or timeout resets', () => {
    expect(
      isInvalidCaptchaResponseError({
        code: 'captcha_failed',
        message: 'captcha protection: request disallowed (invalid-input-response)',
        status: 400,
      }),
    ).toBe(true)

    expect(
      isInvalidCaptchaResponseError({
        code: 'captcha_failed',
        message: 'Turnstile token has already been used.',
        status: 400,
      }),
    ).toBe(false)
  })

  it('falls back only for captcha-related messages', () => {
    expect(
      getCaptchaFeedbackMessage(
        {
          code: 'captcha_failed',
          message: 'captcha verification process failed',
          status: 400,
        },
        'Human verification expired or was already used. It has been reset.',
      ),
    ).toBe('Human verification expired or was already used. It has been reset.')

    expect(
      getCaptchaFeedbackMessage(
        'Invalid login credentials',
        'Human verification expired or was already used. It has been reset.',
      ),
    ).toBe('Invalid login credentials')
  })
})
