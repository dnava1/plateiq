import { describe, it, expect } from 'vitest'
import { cn, formatWeight, roundToNearest, formatDate } from './utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('deduplicates Tailwind conflicts', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('handles empty inputs', () => {
    expect(cn()).toBe('')
  })
})

describe('formatWeight', () => {
  it('formats lbs without conversion', () => {
    expect(formatWeight(225, 'lbs')).toBe('225 lbs')
  })

  it('converts lbs to kg', () => {
    expect(formatWeight(225, 'kg')).toBe('102.1 kg')
  })

  it('rounds to one decimal', () => {
    expect(formatWeight(135, 'kg')).toBe('61.2 kg')
  })

  it('handles zero weight', () => {
    expect(formatWeight(0, 'lbs')).toBe('0 lbs')
    expect(formatWeight(0, 'kg')).toBe('0 kg')
  })

  it('formats fractional lbs', () => {
    expect(formatWeight(132.5, 'lbs')).toBe('132.5 lbs')
  })
})

describe('roundToNearest', () => {
  it('rounds to nearest 5', () => {
    expect(roundToNearest(137, 5)).toBe(135)
    expect(roundToNearest(138, 5)).toBe(140)
  })

  it('rounds to nearest 2.5', () => {
    expect(roundToNearest(136, 2.5)).toBe(135)
    expect(roundToNearest(136.5, 2.5)).toBe(137.5)
  })

  it('returns exact value when already rounded', () => {
    expect(roundToNearest(135, 5)).toBe(135)
  })

  it('handles zero', () => {
    expect(roundToNearest(0, 5)).toBe(0)
  })
})

describe('formatDate', () => {
  it('formats a date string', () => {
    const result = formatDate('2024-06-15T12:00:00Z')
    expect(result).toMatch(/Jun\s+15,\s+2024/)
  })

  it('formats a Date object', () => {
    const result = formatDate(new Date(2024, 0, 15))
    expect(result).toMatch(/Jan/)
    expect(result).toMatch(/2024/)
  })
})
