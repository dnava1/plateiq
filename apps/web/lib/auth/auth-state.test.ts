import { describe, expect, it } from 'vitest'
import { sanitizeNextPath } from './auth-state'

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