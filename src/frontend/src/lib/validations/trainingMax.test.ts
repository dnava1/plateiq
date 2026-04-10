import { describe, it, expect } from 'vitest'
import { setTrainingMaxSchema } from './trainingMax'

describe('setTrainingMaxSchema', () => {
  const validInput = {
    exerciseId: 1,
    weightLbs: 225,
    tmPercentage: 0.90,
  }

  it('accepts valid training max input', () => {
    const result = setTrainingMaxSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('accepts input with optional effectiveDate', () => {
    const result = setTrainingMaxSchema.safeParse({
      ...validInput,
      effectiveDate: '2025-01-15',
    })
    expect(result.success).toBe(true)
  })

  it('accepts minimum valid tmPercentage (0.5)', () => {
    const result = setTrainingMaxSchema.safeParse({
      ...validInput,
      tmPercentage: 0.5,
    })
    expect(result.success).toBe(true)
  })

  it('accepts maximum valid tmPercentage (1.0)', () => {
    const result = setTrainingMaxSchema.safeParse({
      ...validInput,
      tmPercentage: 1.0,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative weight', () => {
    const result = setTrainingMaxSchema.safeParse({
      ...validInput,
      weightLbs: -10,
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero weight', () => {
    const result = setTrainingMaxSchema.safeParse({
      ...validInput,
      weightLbs: 0,
    })
    expect(result.success).toBe(false)
  })

  it('accepts large display values because the canonical cap is enforced after unit conversion', () => {
    const result = setTrainingMaxSchema.safeParse({
      ...validInput,
      weightLbs: 2001,
    })
    expect(result.success).toBe(true)
  })

  it('rejects tmPercentage below 0.5', () => {
    const result = setTrainingMaxSchema.safeParse({
      ...validInput,
      tmPercentage: 0.3,
    })
    expect(result.success).toBe(false)
  })

  it('rejects tmPercentage above 1.0', () => {
    const result = setTrainingMaxSchema.safeParse({
      ...validInput,
      tmPercentage: 1.5,
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer exerciseId', () => {
    const result = setTrainingMaxSchema.safeParse({
      ...validInput,
      exerciseId: 1.5,
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-positive exerciseId', () => {
    const result = setTrainingMaxSchema.safeParse({
      ...validInput,
      exerciseId: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const result = setTrainingMaxSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
