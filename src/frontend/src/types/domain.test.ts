import { describe, it, expect } from 'vitest'
import type { SetType, ExerciseCategory, MovementPattern, IntensityType, ProgressionStyle, PreferredUnit, ProgramLevel } from './domain'

describe('domain enum types', () => {
  it('SetType values are valid', () => {
    const values: SetType[] = ['warmup', 'main', 'amrap', 'supplement', 'accessory']
    expect(values).toHaveLength(5)
    values.forEach((v) => expect(typeof v).toBe('string'))
  })

  it('ExerciseCategory values are valid', () => {
    const values: ExerciseCategory[] = ['main', 'accessory']
    expect(values).toHaveLength(2)
  })

  it('MovementPattern values are valid', () => {
    const values: MovementPattern[] = ['push', 'pull', 'hinge', 'squat', 'single_leg', 'core', 'other']
    expect(values).toHaveLength(7)
    values.forEach((v) => expect(v).toMatch(/^[a-z_]+$/))
  })

  it('IntensityType values are valid', () => {
    const values: IntensityType[] = ['percentage_tm', 'percentage_1rm', 'rpe', 'fixed_weight', 'bodyweight', 'percentage_work_set']
    expect(values).toHaveLength(6)
    values.forEach((v) => expect(v).toMatch(/^[a-z_0-9]+$/))
  })

  it('ProgressionStyle values are valid', () => {
    const values: ProgressionStyle[] = ['linear_per_session', 'linear_per_week', 'linear_per_cycle', 'percentage_cycle', 'wave', 'autoregulated', 'custom']
    expect(values).toHaveLength(7)
    values.forEach((v) => expect(v).toMatch(/^[a-z_]+$/))
  })

  it('PreferredUnit values are valid', () => {
    const values: PreferredUnit[] = ['lbs', 'kg']
    expect(values).toHaveLength(2)
  })

  it('ProgramLevel values are valid', () => {
    const values: ProgramLevel[] = ['beginner', 'intermediate', 'advanced']
    expect(values).toHaveLength(3)
  })
})
