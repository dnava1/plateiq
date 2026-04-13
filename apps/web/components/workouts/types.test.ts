import { describe, expect, it } from 'vitest'
import {
  estimateOneRepMax,
  isEstimatedOneRepMaxPr,
} from './types'

describe('workout type helpers', () => {
  it('calculates the estimated 1RM from a completed set', () => {
    expect(estimateOneRepMax(225, 5)).toBeCloseTo(262.31, 2)
  })

  it('falls back to the lifted weight for singles and very high rep counts', () => {
    expect(estimateOneRepMax(225, 1)).toBe(225)
    expect(estimateOneRepMax(225, 40)).toBe(225)
  })

  it('treats the first estimate as a PR when no history exists', () => {
    expect(isEstimatedOneRepMaxPr(262.31, [])).toBe(true)
  })

  it('requires the new estimate to clear the epsilon threshold', () => {
    expect(isEstimatedOneRepMaxPr(262.6, [262.3])).toBe(false)
    expect(isEstimatedOneRepMaxPr(262.9, [262.3])).toBe(true)
  })
})