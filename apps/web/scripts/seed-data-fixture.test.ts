import { describe, expect, it } from 'vitest'
import { buildSeedDataPlan, generateWendler531BbbSets, summarizeSeedDataPlan } from './seed-data-fixture.mjs'

describe('generateWendler531BbbSets', () => {
  it('builds the expected 5/3/1 BBB set structure', () => {
    const sets = generateWendler531BbbSets('bench', 3, {
      bench: 190,
      deadlift: 335,
      ohp: 125,
      squat: 295,
    })

    expect(sets).toHaveLength(8)
    expect(sets.map((set) => set.setOrder)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(sets[2]).toMatchObject({ isAmrap: true, repsPrescribed: 5, setType: 'amrap' })
    expect(sets.slice(3).every((set) => set.setType === 'variation' && set.repsPrescribed === 10)).toBe(true)
  })
})

describe('buildSeedDataPlan', () => {
  it('creates a reusable verification fixture with stalled bench history, strict bodyweight review data, weighted variants, and a resumable workout', () => {
    const referenceDate = new Date('2026-04-12T12:00:00.000Z')
    const plan = buildSeedDataPlan(referenceDate)
    const summary = summarizeSeedDataPlan(plan)
    const activeCycle = plan.cycles[2]
    const allSets = plan.cycles.flatMap((cycle) => cycle.workouts).flatMap((workout) => workout.sets)
    const resumableBenchWorkout = activeCycle.workouts.find((workout) => workout.dayKey === 'bench' && workout.weekNumber === 3) as
      | { sets: Array<{ repsActual: number | null; setType: string }>; completedAt: string | null }
      | undefined

    expect(plan.trainingMaxes.filter((entry) => entry.exerciseKey === 'bench')).toHaveLength(3)
    expect(plan.profile).toMatchObject({
      preferredUnit: 'lbs',
      strengthProfileAgeYears: 30,
      strengthProfileBodyweightLbs: 181,
      strengthProfileSex: 'male',
      weightRoundingLbs: 5,
    })
    expect(summary.totalCycles).toBe(3)
    expect(summary.totalWorkouts).toBe(43)
    expect(summary.completedWorkoutCount).toBe(42)
    expect(summary.incompleteWorkoutCount).toBe(1)
    expect(summary.totalSets).toBe(660)
    expect(summary.lastBenchPrDate).toBe('2026-03-12')
    expect(allSets.some((set) => set.exerciseKey === 'dip' && set.intensityType === 'bodyweight' && set.weightLbs === 0)).toBe(true)
    expect(allSets.some((set) => set.exerciseKey === 'weighted_dip' && set.intensityType === 'fixed_weight' && set.weightLbs > 0)).toBe(true)
    expect(allSets.some((set) => set.exerciseKey === 'chin_up' && set.intensityType === 'bodyweight' && set.weightLbs === 0)).toBe(true)
    expect(allSets.some((set) => set.exerciseKey === 'weighted_chin_up' && set.intensityType === 'fixed_weight' && set.weightLbs > 0)).toBe(true)
    expect(allSets.some((set) => set.exerciseKey === 'pull_up' && set.intensityType === 'bodyweight' && set.weightLbs === 0)).toBe(true)
    expect(allSets.some((set) => set.exerciseKey === 'weighted_pull_up' && set.intensityType === 'fixed_weight' && set.weightLbs > 0)).toBe(true)
    expect(allSets.every((set) => set.exerciseKey !== 'weighted_dip' || set.intensityType === 'fixed_weight')).toBe(true)
    expect(allSets.every((set) => set.exerciseKey !== 'weighted_chin_up' || set.intensityType === 'fixed_weight')).toBe(true)
    expect(allSets.every((set) => set.exerciseKey !== 'weighted_pull_up' || set.intensityType === 'fixed_weight')).toBe(true)
    expect(resumableBenchWorkout).toBeDefined()
    expect(resumableBenchWorkout?.completedAt).toBeNull()
    expect(resumableBenchWorkout?.sets).toHaveLength(8)
    expect(resumableBenchWorkout?.sets.filter((set: { repsActual: number | null }) => set.repsActual !== null)).toHaveLength(4)
    expect(activeCycle.workouts.filter((workout) => workout.dayKey === 'bench' && workout.weekNumber < 3).every((workout) => {
      const amrap = workout.sets.find((set: { setType: string; repsActual: number | null }) => set.setType === 'amrap')
      return amrap?.repsActual === null
    })).toBe(true)
  })
})