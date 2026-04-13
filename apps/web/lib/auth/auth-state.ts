import type { User } from '@supabase/supabase-js'

export type AuthKind = 'signed_out' | 'anonymous' | 'permanent'

type AuthUserLike = Pick<User, 'id' | 'is_anonymous'> | null | undefined

export function getAuthKind(user: AuthUserLike): AuthKind {
  if (!user) {
    return 'signed_out'
  }

  return user.is_anonymous ? 'anonymous' : 'permanent'
}

export function getAuthScope(user: AuthUserLike) {
  if (!user) {
    return null
  }

  return user.id
}

export function isAnonymousUser(user: AuthUserLike) {
  return Boolean(user?.is_anonymous)
}

export function isPermanentUser(user: AuthUserLike) {
  return Boolean(user && !user.is_anonymous)
}

function decodeNextPath(next: string) {
  try {
    return decodeURIComponent(next)
  } catch {
    return next
  }
}

export function sanitizeNextPath(next: string | null | undefined, fallback = '/dashboard') {
  if (!next || !next.startsWith('/')) {
    return fallback
  }

  const decodedNext = decodeNextPath(next)

  if (
    decodedNext.startsWith('//')
    || decodedNext.includes('\\')
    || /[\u0000-\u001f]/.test(decodedNext)
  ) {
    return fallback
  }

  return next
}