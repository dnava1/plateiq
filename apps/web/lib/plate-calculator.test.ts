import { describe, expect, it } from 'vitest'
import { createEmptyAnalyticsBodyweightLane, createEmptyAnalyticsCoverage } from './analytics'
import { createEmptyStrengthProfile } from './strength-profile'
import {
  buildPlateCalculatorSuggestion,
  calculatePlateBreakdown,
  STANDARD_PLATE_OPTIONS_KG_LBS,
} from './plate-calculator'
import type { AnalyticsData } from '@/types/analytics'
import { displayToLbs, lbsToDisplay } from './utils'

const analyticsFixture: AnalyticsData = {
  bodyweightLane: createEmptyAnalyticsBodyweightLane(),
  coverage: createEmptyAnalyticsCoverage(),
  e1rmTrend: [
    { date: '2026-04-05', exerciseId: 1, exerciseName: 'Bench Press', weight: 205, reps: 6, e1rm: 246 },
    { date: '2026-04-07', exerciseId: 2, exerciseName: 'Squat', weight: 315, reps: 5, e1rm: 367.5 },
  ],
  volumeTrend: [],
  prHistory: [
    { date: '2026-04-05', exerciseId: 1, exerciseName: 'Bench Press', weight: 205, reps: 6, e1rm: 246 },
    { date: '2026-04-09', exerciseId: 2, exerciseName: 'Squat', weight: 320, reps: 5, e1rm: 373.3 },
  ],
  consistency: {
    totalSessions: 0,
    weeksActive: 0,
    firstSession: null,
    lastSession: null,
  },
  muscleBalance: [],
  stallDetection: [],
  tmProgression: [],
  strengthProfile: createEmptyStrengthProfile(),
}

describe('calculatePlateBreakdown', () => {
  it('rounds the target load and returns a balanced plate stack', () => {
    expect(calculatePlateBreakdown(232)).toEqual({
      achievedWeightLbs: 230,
      barbellWeightLbs: 45,
      perSideLoadLbs: 92.5,
      platesPerSide: [
        { countPerSide: 2, weightLbs: 45 },
        { countPerSide: 1, weightLbs: 2.5 },
      ],
      remainderLbs: 0,
      roundedTargetWeightLbs: 230,
      targetWeightLbs: 232,
    })
  })

  it('supports explicit round-down and round-up behavior', () => {
    expect(calculatePlateBreakdown(239.8, { roundingLbs: 5, roundingMode: 'down' }).roundedTargetWeightLbs).toBe(235)
    expect(calculatePlateBreakdown(239.8, { roundingLbs: 5, roundingMode: 'up' }).roundedTargetWeightLbs).toBe(240)
  })

  it('supports 2.5 lb rounding with 1.25 lb change plates for pound users', () => {
    const breakdown = calculatePlateBreakdown(47.5, {
      roundingLbs: 2.5,
    })

    expect(breakdown.roundedTargetWeightLbs).toBe(47.5)
    expect(breakdown.remainderLbs).toBe(0)
    expect(breakdown.platesPerSide).toEqual([
      { countPerSide: 1, weightLbs: 1.25 },
    ])
  })

  it('supports metric barbells and metric plate sizes without inventing pound plates', () => {
    const breakdown = calculatePlateBreakdown(displayToLbs(45, 'kg'), {
      barbellWeightLbs: displayToLbs(20, 'kg'),
      plateOptionsLbs: STANDARD_PLATE_OPTIONS_KG_LBS,
      roundingLbs: displayToLbs(2.5, 'kg'),
    })

    expect(lbsToDisplay(breakdown.roundedTargetWeightLbs, 'kg', 2)).toBe(45)
    expect(breakdown.platesPerSide).toEqual([
      { countPerSide: 1, weightLbs: displayToLbs(10, 'kg') },
      { countPerSide: 1, weightLbs: displayToLbs(2.5, 'kg') },
    ])
  })

  it('supports 1 kg rounding with 0.5 kg change plates for metric users', () => {
    const breakdown = calculatePlateBreakdown(displayToLbs(41, 'kg'), {
      barbellWeightLbs: displayToLbs(20, 'kg'),
      plateOptionsLbs: STANDARD_PLATE_OPTIONS_KG_LBS,
      roundingLbs: displayToLbs(1, 'kg'),
    })

    expect(lbsToDisplay(breakdown.roundedTargetWeightLbs, 'kg', 2)).toBe(41)
    expect(breakdown.remainderLbs).toBe(0)
    expect(breakdown.platesPerSide).toEqual([
      { countPerSide: 1, weightLbs: displayToLbs(10, 'kg') },
      { countPerSide: 1, weightLbs: displayToLbs(0.5, 'kg') },
    ])
  })

  it('finds an exact low-load metric stack instead of underloading with a greedy pass', () => {
    const breakdown = calculatePlateBreakdown(displayToLbs(23, 'kg'), {
      barbellWeightLbs: displayToLbs(20, 'kg'),
      plateOptionsLbs: STANDARD_PLATE_OPTIONS_KG_LBS,
      roundingLbs: displayToLbs(1, 'kg'),
    })

    expect(lbsToDisplay(breakdown.roundedTargetWeightLbs, 'kg', 2)).toBe(23)
    expect(breakdown.remainderLbs).toBe(0)
    expect(breakdown.platesPerSide).toEqual([
      { countPerSide: 3, weightLbs: displayToLbs(0.5, 'kg') },
    ])
  })
})

describe('buildPlateCalculatorSuggestion', () => {
  it('uses the latest filtered e1rm point to propose a rounded working weight', () => {
    expect(buildPlateCalculatorSuggestion(analyticsFixture, 2)).toEqual({
      exerciseId: 2,
      exerciseName: 'Squat',
      latestEstimatedOneRepMaxLbs: 367.5,
      latestLoggedWeightLbs: 320,
      suggestedWorkingWeightLbs: 255,
    })
  })

  it('falls back to the latest PR data when e1rm points are unavailable', () => {
    expect(buildPlateCalculatorSuggestion({ ...analyticsFixture, e1rmTrend: [] }, 2)).toEqual({
      exerciseId: 2,
      exerciseName: 'Squat',
      latestEstimatedOneRepMaxLbs: 373.3,
      latestLoggedWeightLbs: 320,
      suggestedWorkingWeightLbs: 320,
    })
  })

  it('supports explicit round modes for suggested working weights', () => {
    expect(buildPlateCalculatorSuggestion(analyticsFixture, 2, 10, 'down').suggestedWorkingWeightLbs).toBe(250)
    expect(buildPlateCalculatorSuggestion(analyticsFixture, 2, 10, 'up').suggestedWorkingWeightLbs).toBe(260)
  })
})
