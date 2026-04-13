export const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? ''

type CaptchaErrorLike = {
  code?: string | null
  message?: string | null
  name?: string | null
  status?: number | null
}

const CAPTCHA_REJECTION_PATTERNS = [
  /captcha/i,
  /turnstile/i,
  /human verification/i,
  /invalid-input-response/i,
  /already redeemed/i,
  /already been used/i,
  /token.*expired/i,
  /expired.*token/i,
  /challenge.*timeout/i,
  /timeout.*challenge/i,
] as const

export function isCaptchaRejectionMessage(message: string) {
  return CAPTCHA_REJECTION_PATTERNS.some((pattern) => pattern.test(message))
}

export function isCaptchaRejectionError(error: CaptchaErrorLike | string | null | undefined) {
  const code = typeof error === 'string' ? '' : error?.code?.trim().toLowerCase() ?? ''
  const message = typeof error === 'string' ? error : error?.message ?? ''
  const status = typeof error === 'string' ? null : error?.status ?? null

  if (code === 'captcha_failed' || code.includes('captcha')) {
    return true
  }

  if ((status === 400 || status === 401 || status === 422 || status === 429) && isCaptchaRejectionMessage(message)) {
    return true
  }

  return isCaptchaRejectionMessage(message)
}

export function isInvalidCaptchaResponseError(error: CaptchaErrorLike | string | null | undefined) {
  const message = typeof error === 'string' ? error : error?.message ?? ''

  return isCaptchaRejectionError(error) && /invalid-input-response/i.test(message)
}

export function getCaptchaFeedbackMessage(error: CaptchaErrorLike | string, fallback: string) {
  const message = typeof error === 'string' ? error : error.message ?? ''

  if (isCaptchaRejectionError(error)) {
    return fallback
  }

  return message
}