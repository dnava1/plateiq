export const DISCARD_GUEST_COOKIE_NAME = 'plateiq-discard-guest-user'
export const DISCARD_GUEST_COOKIE_MAX_AGE_SECONDS = 10 * 60
export const EXISTING_GOOGLE_IDENTITY_ERROR_CODE = 'identity_already_exists'
export const EXISTING_GOOGLE_UPGRADE_MODE = 'existing_google'

export function getDiscardGuestCookieOptions() {
  return {
    httpOnly: true,
    maxAge: DISCARD_GUEST_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  }
}

export function getExpiredDiscardGuestCookieOptions() {
  return {
    ...getDiscardGuestCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  }
}

export function getExistingGoogleUpgradeRedirect(origin: string, next: string) {
  const url = new URL('/auth/callback', origin)
  url.searchParams.set('next', next)
  url.searchParams.set('upgrade_mode', EXISTING_GOOGLE_UPGRADE_MODE)
  return url.toString()
}

export function getExistingGoogleUpgradeRetryRedirect(origin: string) {
  const url = new URL('/upgrade', origin)
  url.searchParams.set('upgrade_mode', EXISTING_GOOGLE_UPGRADE_MODE)
  return url.toString()
}