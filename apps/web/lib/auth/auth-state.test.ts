import { describe, expect, it } from 'vitest'
import { isLaunchRoutePath, isPublicAuthRoute, sanitizeNextPath } from './auth-state'

describe('isPublicAuthRoute', () => {
  it('allows the shared public auth routes and callback path', () => {
    expect(isPublicAuthRoute('/')).toBe(true)
    expect(isPublicAuthRoute('/continue')).toBe(true)
    expect(isPublicAuthRoute('/gym')).toBe(true)
    expect(isPublicAuthRoute('/launch/')).toBe(true)
    expect(isPublicAuthRoute('/legal')).toBe(true)
    expect(isPublicAuthRoute('/auth/callback')).toBe(true)
    expect(isPublicAuthRoute('/auth/callback/google')).toBe(true)
  })

  it('keeps protected and guest-only routes out of the public auth allowlist', () => {
    expect(isPublicAuthRoute('/dashboard')).toBe(false)
    expect(isPublicAuthRoute('/exercises')).toBe(false)
    expect(isPublicAuthRoute('/upgrade')).toBe(false)
  })
})

describe('isLaunchRoutePath', () => {
  it('normalizes launch shell paths with a trailing slash', () => {
    expect(isLaunchRoutePath('/launch/')).toBe(true)
    expect(isLaunchRoutePath('/dashboard')).toBe(false)
  })
})

describe('sanitizeNextPath', () => {
  it('preserves safe relative paths', () => {
    expect(sanitizeNextPath('/dashboard?tab=analytics')).toBe('/dashboard?tab=analytics')
  })

  it('falls back for non-relative targets', () => {
    expect(sanitizeNextPath('https://attacker.test')).toBe('/dashboard')
  })

  it('falls back for encoded network-path redirects', () => {
    expect(sanitizeNextPath('/%2F%2Fattacker.test')).toBe('/dashboard')
  })

  it('falls back for encoded backslash redirects', () => {
    expect(sanitizeNextPath('/%5Cattacker.test')).toBe('/dashboard')
  })
})