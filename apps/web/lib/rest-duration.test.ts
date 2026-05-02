import { describe, expect, it } from 'vitest'
import {
  formatRestDurationInput,
  isValidRestDurationSeconds,
  parseRestDurationInput,
} from './rest-duration'

describe('rest duration helpers', () => {
  it('parses common duration input formats into seconds', () => {
    expect(parseRestDurationInput('2:45')).toBe(165)
    expect(parseRestDurationInput('1:02:03')).toBe(3723)
    expect(parseRestDurationInput('90s')).toBe(90)
    expect(parseRestDurationInput('2m 15s')).toBe(135)
    expect(parseRestDurationInput('1.5')).toBe(90)
  })

  it('formats rest durations as compact clock values', () => {
    expect(formatRestDurationInput(null)).toBe('')
    expect(formatRestDurationInput(90)).toBe('1:30')
    expect(formatRestDurationInput(3723)).toBe('1:02:03')
  })

  it('validates practical timer bounds', () => {
    expect(isValidRestDurationSeconds(300)).toBe(true)
    expect(isValidRestDurationSeconds(301)).toBe(false)
    expect(isValidRestDurationSeconds(-1)).toBe(false)
  })
})
