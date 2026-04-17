import { describe, expect, it } from 'vitest'
import { calculateBenchmarkMultiRepMax } from '@/lib/strength-benchmarks'
import { DEFAULT_WEIGHT_ROUNDING_KG_LBS, roundToIncrement } from '@/lib/utils'
import {
  buildStrengthProfile,
  calculateStrengthRepMax,
  calculateSymmetryScore,
  estimateStrengthOneRepMax,
} from './strength-profile'
import type { StrengthProfileRawData } from '@/types/analytics'

describe('strength profile helpers', () => {
  it('uses the reverse-engineered rep conversion formulas', () => {
    expect(estimateStrengthOneRepMax(225, 5)).toBeCloseTo(262.3, 1)
    expect(calculateStrengthRepMax(5, 225, 5)).toBeCloseTo(225, 1)
    expect(calculateStrengthRepMax(1, 225, 5)).toBeCloseTo(262.3, 1)
  })

  it('calculates symmetry from score variance', () => {
    expect(calculateSymmetryScore([95, 100, 105])).toBeCloseTo(83.3, 1)
  })

  it('builds benchmark category scores, totals, and lift expectations from raw lift data', () => {
    const rawStrengthProfile: StrengthProfileRawData = {
      lifts: [
        {
          actualRepMaxes: [{ reps: 1, weightLbs: 475.8 }],
          benchmarkOneRepMaxLbs: 475.8,
          benchmarkRepMaxes: [{ reps: 1, weightLbs: 475.8 }],
          bestDate: '2026-04-10',
          bestExternalWeightLbs: 475.8,
          bestOneRepMaxLbs: 475.8,
          bestReps: 1,
          bestTotalLoadLbs: 475.8,
          categoryKey: 'squat',
          categoryLabel: 'Squat',
          displayName: 'Back Squat',
          liftSlug: 'back_squat',
          muscleWeights: {},
          sourceExerciseId: 1,
          sourceExerciseName: 'Squat',
        },
        {
          actualRepMaxes: [{ reps: 1, weightLbs: 520.8 }],
          benchmarkOneRepMaxLbs: 520.8,
          benchmarkRepMaxes: [{ reps: 1, weightLbs: 520.8 }],
          bestDate: '2026-04-08',
          bestExternalWeightLbs: 520.8,
          bestOneRepMaxLbs: 520.8,
          bestReps: 1,
          bestTotalLoadLbs: 520.8,
          categoryKey: 'deadlift',
          categoryLabel: 'Deadlift',
          displayName: 'Deadlift',
          liftSlug: 'deadlift',
          muscleWeights: {},
          sourceExerciseId: 2,
          sourceExerciseName: 'Deadlift',
        },
        {
          actualRepMaxes: [{ reps: 1, weightLbs: 321.6 }],
          benchmarkOneRepMaxLbs: 321.6,
          benchmarkRepMaxes: [{ reps: 1, weightLbs: 321.6 }],
          bestDate: '2026-04-09',
          bestExternalWeightLbs: 321.6,
          bestOneRepMaxLbs: 321.6,
          bestReps: 1,
          bestTotalLoadLbs: 321.6,
          categoryKey: 'bench_press',
          categoryLabel: 'Bench Press',
          displayName: 'Bench Press',
          liftSlug: 'bench_press',
          muscleWeights: {},
          sourceExerciseId: 3,
          sourceExerciseName: 'Bench Press',
        },
      ],
      minimumCategoryCount: 2,
      minimumLiftCount: 3,
      profile: {
        ageYears: 32,
        bodyweightLbs: 181,
        sex: 'male',
      },
    }

    const profile = buildStrengthProfile(rawStrengthProfile)

    expect(profile.status).toBe('ready')
    expect(profile.categories).toEqual([
      {
        categoryKey: 'squat',
        categoryLabel: 'Squat',
        liftName: 'Back Squat',
        liftSlug: 'back_squat',
        score: 104.8,
        strengthLabel: 'Exceptional',
      },
      {
        categoryKey: 'floorPull',
        categoryLabel: 'Floor Pull',
        liftName: 'Deadlift',
        liftSlug: 'deadlift',
        score: 99.8,
        strengthLabel: 'Advanced',
      },
      {
        categoryKey: 'horizontalPress',
        categoryLabel: 'Horizontal Press',
        liftName: 'Bench Press',
        liftSlug: 'bench_press',
        score: 94.5,
        strengthLabel: 'Advanced',
      },
    ])
    expect(profile.totalScore).toBe(99.7)
    expect(profile.totalLabel).toBe('Advanced')
    expect(profile.strongestLift?.displayName).toBe('Back Squat')
    expect(profile.strongestLift?.deviationFromTotalPct).toBe(5.6)
    expect(profile.weakestLift?.displayName).toBe('Bench Press')
    expect(profile.weakestLift?.deviationFromTotalPct).toBe(-4.5)
    expect(profile.symmetryScore).toBe(82.3)
    expect(profile.muscleGroups).toContainEqual(expect.objectContaining({ muscleKey: 'quads', score: 103.2 }))
  })

  it('uses the active kg rounding increment for expected standards and rep maxes', () => {
    const rawStrengthProfile: StrengthProfileRawData = {
      lifts: [
        {
          actualRepMaxes: [{ reps: 1, weightLbs: 475.8 }],
          benchmarkOneRepMaxLbs: 475.8,
          benchmarkRepMaxes: [{ reps: 1, weightLbs: 475.8 }],
          bestDate: '2026-04-10',
          bestExternalWeightLbs: 475.8,
          bestOneRepMaxLbs: 475.8,
          bestReps: 1,
          bestTotalLoadLbs: 475.8,
          categoryKey: 'squat',
          categoryLabel: 'Squat',
          displayName: 'Back Squat',
          liftSlug: 'back_squat',
          muscleWeights: {},
          sourceExerciseId: 1,
          sourceExerciseName: 'Squat',
        },
        {
          actualRepMaxes: [{ reps: 1, weightLbs: 520.8 }],
          benchmarkOneRepMaxLbs: 520.8,
          benchmarkRepMaxes: [{ reps: 1, weightLbs: 520.8 }],
          bestDate: '2026-04-08',
          bestExternalWeightLbs: 520.8,
          bestOneRepMaxLbs: 520.8,
          bestReps: 1,
          bestTotalLoadLbs: 520.8,
          categoryKey: 'deadlift',
          categoryLabel: 'Deadlift',
          displayName: 'Deadlift',
          liftSlug: 'deadlift',
          muscleWeights: {},
          sourceExerciseId: 2,
          sourceExerciseName: 'Deadlift',
        },
        {
          actualRepMaxes: [{ reps: 1, weightLbs: 321.6 }],
          benchmarkOneRepMaxLbs: 321.6,
          benchmarkRepMaxes: [{ reps: 1, weightLbs: 321.6 }],
          bestDate: '2026-04-09',
          bestExternalWeightLbs: 321.6,
          bestOneRepMaxLbs: 321.6,
          bestReps: 1,
          bestTotalLoadLbs: 321.6,
          categoryKey: 'bench_press',
          categoryLabel: 'Bench Press',
          displayName: 'Bench Press',
          liftSlug: 'bench_press',
          muscleWeights: {},
          sourceExerciseId: 3,
          sourceExerciseName: 'Bench Press',
        },
      ],
      minimumCategoryCount: 2,
      minimumLiftCount: 3,
      profile: {
        ageYears: 32,
        bodyweightLbs: 181,
        sex: 'male',
      },
    }

    const poundsProfile = buildStrengthProfile(rawStrengthProfile)
    const kilogramsProfile = buildStrengthProfile(rawStrengthProfile, DEFAULT_WEIGHT_ROUNDING_KG_LBS)

    expect(kilogramsProfile.lifts.some((lift, index) => lift.expectedOneRepMaxLbs !== poundsProfile.lifts[index]?.expectedOneRepMaxLbs)).toBe(true)

    for (const lift of kilogramsProfile.lifts) {
      expect(lift.expectedOneRepMaxLbs).not.toBeNull()
      expect(roundToIncrement(lift.expectedOneRepMaxLbs!, DEFAULT_WEIGHT_ROUNDING_KG_LBS)).toBe(lift.expectedOneRepMaxLbs)

      for (const repMax of lift.expectedRepMaxes) {
        expect(calculateBenchmarkMultiRepMax(repMax.reps, lift.expectedOneRepMaxLbs!)).not.toBeNull()
        expect(repMax.weightLbs).toBe(
          roundToIncrement(calculateBenchmarkMultiRepMax(repMax.reps, lift.expectedOneRepMaxLbs!)!, DEFAULT_WEIGHT_ROUNDING_KG_LBS, 'down')
        )
      }
    }
  })

  it('calculates total score and symmetry from raw lift scores before display rounding', () => {
    const rawStrengthProfile: StrengthProfileRawData = {
      lifts: [
        {
          actualRepMaxes: [{ reps: 1, weightLbs: 357.4799734252705 }],
          benchmarkOneRepMaxLbs: 357.4799734252705,
          benchmarkRepMaxes: [{ reps: 1, weightLbs: 357.4799734252705 }],
          bestDate: '2026-04-10',
          bestExternalWeightLbs: 357.4799734252705,
          bestOneRepMaxLbs: 357.4799734252705,
          bestReps: 1,
          bestTotalLoadLbs: 357.4799734252705,
          categoryKey: 'squat',
          categoryLabel: 'Squat',
          displayName: 'Back Squat',
          liftSlug: 'back_squat',
          muscleWeights: {},
          sourceExerciseId: 1,
          sourceExerciseName: 'Squat',
        },
        {
          actualRepMaxes: [{ reps: 1, weightLbs: 444.66410828956174 }],
          benchmarkOneRepMaxLbs: 444.66410828956174,
          benchmarkRepMaxes: [{ reps: 1, weightLbs: 444.66410828956174 }],
          bestDate: '2026-04-08',
          bestExternalWeightLbs: 444.66410828956174,
          bestOneRepMaxLbs: 444.66410828956174,
          bestReps: 1,
          bestTotalLoadLbs: 444.66410828956174,
          categoryKey: 'deadlift',
          categoryLabel: 'Deadlift',
          displayName: 'Deadlift',
          liftSlug: 'deadlift',
          muscleWeights: {},
          sourceExerciseId: 2,
          sourceExerciseName: 'Deadlift',
        },
        {
          actualRepMaxes: [{ reps: 1, weightLbs: 242.8056826230806 }],
          benchmarkOneRepMaxLbs: 242.8056826230806,
          benchmarkRepMaxes: [{ reps: 1, weightLbs: 242.8056826230806 }],
          bestDate: '2026-04-09',
          bestExternalWeightLbs: 242.8056826230806,
          bestOneRepMaxLbs: 242.8056826230806,
          bestReps: 1,
          bestTotalLoadLbs: 242.8056826230806,
          categoryKey: 'bench_press',
          categoryLabel: 'Bench Press',
          displayName: 'Bench Press',
          liftSlug: 'bench_press',
          muscleWeights: {},
          sourceExerciseId: 3,
          sourceExerciseName: 'Bench Press',
        },
        {
          actualRepMaxes: [{ reps: 1, weightLbs: 161.69603937802245 }],
          benchmarkOneRepMaxLbs: 161.69603937802245,
          benchmarkRepMaxes: [{ reps: 1, weightLbs: 161.69603937802245 }],
          bestDate: '2026-04-07',
          bestExternalWeightLbs: 161.69603937802245,
          bestOneRepMaxLbs: 161.69603937802245,
          bestReps: 1,
          bestTotalLoadLbs: 161.69603937802245,
          categoryKey: 'overhead_press',
          categoryLabel: 'Overhead Press',
          displayName: 'Overhead Press',
          liftSlug: 'overhead_press',
          muscleWeights: {},
          sourceExerciseId: 4,
          sourceExerciseName: 'Overhead Press',
        },
        {
          actualRepMaxes: [{ reps: 1, weightLbs: 222.33205414478087 }],
          benchmarkOneRepMaxLbs: 222.33205414478087,
          benchmarkRepMaxes: [{ reps: 1, weightLbs: 222.33205414478087 }],
          bestDate: '2026-04-06',
          bestExternalWeightLbs: 222.33205414478087,
          bestOneRepMaxLbs: 222.33205414478087,
          bestReps: 1,
          bestTotalLoadLbs: 222.33205414478087,
          categoryKey: 'pendlay_row',
          categoryLabel: 'Pendlay Row',
          displayName: 'Pendlay Row',
          liftSlug: 'pendlay_row',
          muscleWeights: {},
          sourceExerciseId: 5,
          sourceExerciseName: 'Pendlay Row',
        },
      ],
      minimumCategoryCount: 3,
      minimumLiftCount: 3,
      profile: {
        ageYears: 25,
        bodyweightLbs: 150,
        sex: 'male',
      },
    }

    const profile = buildStrengthProfile(rawStrengthProfile)

    expect(profile.lifts.map((lift) => lift.score)).toEqual([89.3, 96.3, 80.8, 82.9, 90.9])
    expect(profile.totalScore).toBe(88.1)
    expect(profile.symmetryScore).toBe(68.7)
  })

  it('keeps total metrics provisional until the minimum lift coverage is met', () => {
    const rawStrengthProfile: StrengthProfileRawData = {
      lifts: [
        {
          actualRepMaxes: [{ reps: 1, weightLbs: 265 }],
          benchmarkOneRepMaxLbs: 250,
          benchmarkRepMaxes: [{ reps: 1, weightLbs: 250 }],
          bestDate: '2026-04-10',
          bestExternalWeightLbs: 265,
          bestOneRepMaxLbs: 265,
          bestReps: 1,
          bestTotalLoadLbs: 265,
          categoryKey: 'bench',
          categoryLabel: 'Bench',
          displayName: 'Bench Press',
          liftSlug: 'bench_press',
          muscleWeights: { chest: 0.6, triceps: 0.4 },
          sourceExerciseId: 1,
          sourceExerciseName: 'Bench Press',
        },
        {
          actualRepMaxes: [{ reps: 1, weightLbs: 155 }],
          benchmarkOneRepMaxLbs: 150,
          benchmarkRepMaxes: [{ reps: 1, weightLbs: 150 }],
          bestDate: '2026-04-09',
          bestExternalWeightLbs: 155,
          bestOneRepMaxLbs: 155,
          bestReps: 1,
          bestTotalLoadLbs: 155,
          categoryKey: 'overhead',
          categoryLabel: 'Overhead',
          displayName: 'Overhead Press',
          liftSlug: 'overhead_press',
          muscleWeights: { shoulders: 0.6, triceps: 0.4 },
          sourceExerciseId: 2,
          sourceExerciseName: 'Overhead Press',
        },
      ],
      minimumCategoryCount: 3,
      minimumLiftCount: 3,
      profile: {
        ageYears: 32,
        bodyweightLbs: 181,
        sex: 'male',
      },
    }

    const profile = buildStrengthProfile(rawStrengthProfile)

    expect(profile.status).toBe('insufficient_data')
    expect(profile.totalScore).toBeNull()
    expect(profile.totalLabel).toBeNull()
    expect(profile.symmetryScore).toBeNull()
    expect(profile.strongestLift).toBeNull()
    expect(profile.weakestLift).toBeNull()
    expect(profile.lifts.every((lift) => lift.deviationFromTotalPct === null && lift.expectedAtTotalScoreLbs === null)).toBe(true)
  })
})