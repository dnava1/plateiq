import { describe, it, expect } from 'vitest'
import { createProgramSchema } from './program'

describe('createProgramSchema', () => {
  it('accepts valid program creation input', () => {
    const result = createProgramSchema.safeParse({
      template_key: 'wendler_531',
      name: "Wendler's 5/3/1",
      rounding: 5,
      tm_percentage: 0.9,
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional supplement_key', () => {
    const result = createProgramSchema.safeParse({
      template_key: 'wendler_531',
      name: "My 5/3/1",
      supplement_key: 'bbb',
      rounding: 5,
      tm_percentage: 0.9,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.supplement_key).toBe('bbb')
    }
  })

  it('rejects missing template_key', () => {
    const result = createProgramSchema.safeParse({
      template_key: '',
      name: 'My Program',
      rounding: 5,
      tm_percentage: 0.9,
    })
    expect(result.success).toBe(false)
  })

  it('rejects name shorter than 2 characters', () => {
    const result = createProgramSchema.safeParse({
      template_key: 'wendler_531',
      name: 'A',
      rounding: 5,
      tm_percentage: 0.9,
    })
    expect(result.success).toBe(false)
  })

  it('rejects tm_percentage below 0.7', () => {
    const result = createProgramSchema.safeParse({
      template_key: 'wendler_531',
      name: 'My Program',
      rounding: 5,
      tm_percentage: 0.6,
    })
    expect(result.success).toBe(false)
  })

  it('rejects tm_percentage above 1.0', () => {
    const result = createProgramSchema.safeParse({
      template_key: 'wendler_531',
      name: 'My Program',
      rounding: 5,
      tm_percentage: 1.05,
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid rounding values', () => {
    for (const rounding of [2.5, 5, 10]) {
      const result = createProgramSchema.safeParse({
        template_key: 'starting_strength',
        name: 'SS Program',
        rounding,
        tm_percentage: 0.9,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects rounding above 10', () => {
    const result = createProgramSchema.safeParse({
      template_key: 'wendler_531',
      name: 'My Program',
      rounding: 15,
      tm_percentage: 0.9,
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional start_date', () => {
    const result = createProgramSchema.safeParse({
      template_key: 'wendler_531',
      name: 'My Program',
      rounding: 5,
      tm_percentage: 0.9,
      start_date: '2026-04-10',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.start_date).toBe('2026-04-10')
    }
  })
})
