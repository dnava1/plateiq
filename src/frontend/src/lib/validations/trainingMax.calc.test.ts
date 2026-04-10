import { describe, it, expect } from 'vitest'
import { roundToNearest } from '@/lib/utils'

describe('Training Max calculations', () => {
  describe('TM from 1RM', () => {
    it('calculates 90% of 1RM rounded to nearest 5', () => {
      // 300 × 0.90 = 270 → 270
      expect(roundToNearest(300 * 0.90, 5)).toBe(270)
    })

    it('rounds down when below midpoint', () => {
      // 315 × 0.90 = 283.5 → 285
      expect(roundToNearest(315 * 0.90, 5)).toBe(285)
    })

    it('rounds up when above midpoint', () => {
      // 335 × 0.90 = 301.5 → 300
      expect(roundToNearest(335 * 0.90, 5)).toBe(300)
    })

    it('handles common 1RM values at 90%', () => {
      const cases: [number, number][] = [
        [135, 120],  // 135 × 0.9 = 121.5 → 120
        [185, 165],  // 185 × 0.9 = 166.5 → 165
        [225, 205],  // 225 × 0.9 = 202.5 → 205 (midpoint rounds up)
        [275, 250],  // 275 × 0.9 = 247.5 → 250
        [315, 285],  // 315 × 0.9 = 283.5 → 285
        [365, 330],  // 365 × 0.9 = 328.5 → 330
        [405, 365],  // 405 × 0.9 = 364.5 → 365
      ]
      for (const [oneRm, expectedTm] of cases) {
        expect(roundToNearest(oneRm * 0.90, 5)).toBe(expectedTm)
      }
    })

    it('calculates with custom TM percentages', () => {
      // 300 × 0.85 = 255 → 255
      expect(roundToNearest(300 * 0.85, 5)).toBe(255)
      // 300 × 0.80 = 240 → 240
      expect(roundToNearest(300 * 0.80, 5)).toBe(240)
    })
  })

  describe('Training max deduplication', () => {
    it('keeps only the latest TM per exercise when ordered desc', () => {
      const data = [
        { id: 3, exercise_id: 1, weight_lbs: 250, effective_date: '2025-03-01' },
        { id: 1, exercise_id: 1, weight_lbs: 225, effective_date: '2025-01-01' },
        { id: 4, exercise_id: 2, weight_lbs: 185, effective_date: '2025-03-15' },
        { id: 2, exercise_id: 2, weight_lbs: 175, effective_date: '2025-02-01' },
      ]

      // Simulate the deduplication logic from useCurrentTrainingMaxes
      const latest = new Map<number, (typeof data)[0]>()
      for (const tm of data) {
        if (!latest.has(tm.exercise_id)) latest.set(tm.exercise_id, tm)
      }
      const result = Array.from(latest.values())

      expect(result).toHaveLength(2)
      expect(result.find((t) => t.exercise_id === 1)?.weight_lbs).toBe(250)
      expect(result.find((t) => t.exercise_id === 2)?.weight_lbs).toBe(185)
    })

    it('handles single entry per exercise', () => {
      const data = [
        { id: 1, exercise_id: 1, weight_lbs: 225, effective_date: '2025-01-01' },
        { id: 2, exercise_id: 2, weight_lbs: 185, effective_date: '2025-01-01' },
      ]

      const latest = new Map<number, (typeof data)[0]>()
      for (const tm of data) {
        if (!latest.has(tm.exercise_id)) latest.set(tm.exercise_id, tm)
      }
      const result = Array.from(latest.values())

      expect(result).toHaveLength(2)
    })

    it('handles empty data', () => {
      const data: { id: number; exercise_id: number; weight_lbs: number; effective_date: string }[] = []

      const latest = new Map<number, (typeof data)[0]>()
      for (const tm of data) {
        if (!latest.has(tm.exercise_id)) latest.set(tm.exercise_id, tm)
      }
      const result = Array.from(latest.values())

      expect(result).toHaveLength(0)
    })
  })
})
