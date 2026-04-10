import { describe, it, expect } from 'vitest'
import { createExerciseSchema } from './exercise'

describe('createExerciseSchema', () => {
  it('accepts valid exercise input', () => {
    const result = createExerciseSchema.safeParse({
      name: 'Barbell Row',
      category: 'accessory',
      movement_pattern: 'pull',
    })
    expect(result.success).toBe(true)
  })

  it('accepts all valid categories', () => {
    for (const category of ['main', 'accessory']) {
      const result = createExerciseSchema.safeParse({
        name: 'Test',
        category,
        movement_pattern: 'push',
      })
      expect(result.success).toBe(true)
    }
  })

  it('accepts all valid movement patterns', () => {
    const patterns = ['push', 'pull', 'hinge', 'squat', 'single_leg', 'core', 'other']
    for (const movement_pattern of patterns) {
      const result = createExerciseSchema.safeParse({
        name: 'Test Exercise',
        category: 'accessory',
        movement_pattern,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects name shorter than 2 characters', () => {
    const result = createExerciseSchema.safeParse({
      name: 'A',
      category: 'main',
      movement_pattern: 'push',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createExerciseSchema.safeParse({
      name: '',
      category: 'main',
      movement_pattern: 'push',
    })
    expect(result.success).toBe(false)
  })

  it('rejects name longer than 100 characters', () => {
    const result = createExerciseSchema.safeParse({
      name: 'A'.repeat(101),
      category: 'main',
      movement_pattern: 'push',
    })
    expect(result.success).toBe(false)
  })

  it('rejects unknown category', () => {
    const result = createExerciseSchema.safeParse({
      name: 'Test',
      category: 'cardio',
      movement_pattern: 'push',
    })
    expect(result.success).toBe(false)
  })

  it('rejects unknown movement pattern', () => {
    const result = createExerciseSchema.safeParse({
      name: 'Test',
      category: 'main',
      movement_pattern: 'cardio',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing fields', () => {
    const result = createExerciseSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
