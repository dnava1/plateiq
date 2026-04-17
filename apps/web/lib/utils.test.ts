import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cn,
  displayToLbs,
  formatDate,
  formatDateAsLocalIso,
  formatDaysPerWeek,
  formatExerciseKey,
  formatRounding,
  formatUnit,
  formatWeekCycle,
  formatWeight,
  getRoundingOptions,
  lbsToDisplay,
  normalizeCadenceCopy,
  parseWeightRoundingLbs,
  roundToIncrement,
  roundToNearest,
  snapWeightRoundingLbsToUnit,
} from './utils'

function createMockDate(localDate: string, utcDate: string) {
  const [year, month, day] = localDate.split('-').map(Number)

  return {
    getFullYear: () => year,
    getMonth: () => month - 1,
    getDate: () => day,
    toISOString: () => `${utcDate}T00:00:00.000Z`,
  } as unknown as Date
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('deduplicates Tailwind conflicts', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('handles empty inputs', () => {
    expect(cn()).toBe('')
  })
})

describe('formatWeight', () => {
  it('formats lbs without conversion', () => {
    expect(formatWeight(225, 'lbs')).toBe('225 lbs')
  })

  it('converts lbs to kg', () => {
    expect(formatWeight(225, 'kg')).toBe('102.1 kg')
  })

  it('rounds to one decimal', () => {
    expect(formatWeight(135, 'kg')).toBe('61.2 kg')
  })

  it('handles zero weight', () => {
    expect(formatWeight(0, 'lbs')).toBe('0 lbs')
    expect(formatWeight(0, 'kg')).toBe('0 kg')
  })

  it('formats fractional lbs', () => {
    expect(formatWeight(132.5, 'lbs')).toBe('132.5 lbs')
  })
})

describe('lbsToDisplay', () => {
  it('returns lbs unchanged for pound preference', () => {
    expect(lbsToDisplay(225, 'lbs')).toBe(225)
  })

  it('converts lbs to kg for display', () => {
    expect(lbsToDisplay(225, 'kg')).toBe(102.1)
  })
})

describe('displayToLbs', () => {
  it('returns lbs unchanged for pound preference', () => {
    expect(displayToLbs(225, 'lbs')).toBe(225)
  })

  it('converts kg input back to lbs', () => {
    expect(displayToLbs(100, 'kg')).toBeCloseTo(220.46, 2)
  })
})

describe('formatUnit', () => {
  it('returns the unit suffix', () => {
    expect(formatUnit('lbs')).toBe('lbs')
    expect(formatUnit('kg')).toBe('kg')
  })
})

describe('formatRounding', () => {
  it('formats canonical rounding in lbs', () => {
    expect(formatRounding(5, 'lbs')).toBe('5 lbs')
  })

  it('formats canonical rounding in kg', () => {
    expect(formatRounding(5, 'kg')).toBe('2.3 kg')
  })
})

describe('cadence formatters', () => {
  it('formats days per week with full words', () => {
    expect(formatDaysPerWeek(1)).toBe('1 day per week')
    expect(formatDaysPerWeek(4)).toBe('4 days per week')
  })

  it('formats week cycles consistently', () => {
    expect(formatWeekCycle(1)).toBe('1-week cycle')
    expect(formatWeekCycle(6)).toBe('6-week cycle')
  })

  it('normalizes abbreviated cadence copy inside longer descriptions', () => {
    expect(normalizeCadenceCopy('Classic LP. 3 days/week, linear progression.')).toBe(
      'Classic LP. 3 days per week, linear progression.',
    )
    expect(normalizeCadenceCopy('High volume. 4d/wk with plenty of accessory work.')).toBe(
      'High volume. 4 days per week with plenty of accessory work.',
    )
  })
})

describe('getRoundingOptions', () => {
  it('keeps canonical lbs values for pound preference', () => {
    expect(getRoundingOptions('lbs')).toEqual([
      { value: 2.5, label: '2.5 lbs' },
      { value: 5, label: '5 lbs' },
      { value: 10, label: '10 lbs' },
    ])
  })

  it('uses unit-native kilogram increments for kilogram preference', () => {
    expect(getRoundingOptions('kg')).toEqual([
      { value: 2.20462, label: '1 kg' },
      { value: 5.51156, label: '2.5 kg' },
      { value: 11.02312, label: '5 kg' },
    ])
  })

  it('keeps the current cross-unit selection available after switching units', () => {
    expect(getRoundingOptions('lbs', 11.02312)).toEqual([
      { value: 2.5, label: '2.5 lbs' },
      { value: 5, label: '5 lbs' },
      { value: 10, label: '10 lbs' },
      { value: 11.02312, label: '11 lbs' },
    ])
  })
})

describe('snapWeightRoundingLbsToUnit', () => {
  it('snaps kilogram-backed preferences to the nearest lbs option', () => {
    expect(snapWeightRoundingLbsToUnit(11.02312, 'lbs')).toBe(10)
    expect(snapWeightRoundingLbsToUnit(2.20462, 'lbs')).toBe(2.5)
  })

  it('snaps pound-backed preferences to the nearest kg option', () => {
    expect(snapWeightRoundingLbsToUnit(10, 'kg')).toBe(11.02312)
    expect(snapWeightRoundingLbsToUnit(5, 'kg')).toBe(5.51156)
  })
})

describe('parseWeightRoundingLbs', () => {
  it('accepts supported kilogram-backed rounding values', () => {
    expect(parseWeightRoundingLbs('2.20462')).toBe(2.20462)
    expect(parseWeightRoundingLbs('5.51156')).toBe(5.51156)
    expect(parseWeightRoundingLbs('11.02312')).toBe(11.02312)
  })

  it('rejects unsupported rounding values', () => {
    expect(parseWeightRoundingLbs('3')).toBeNull()
    expect(parseWeightRoundingLbs('')).toBeNull()
  })
})

describe('formatExerciseKey', () => {
  it('formats common shorthand exercise keys into readable labels', () => {
    expect(formatExerciseKey('bench')).toBe('Bench Press')
    expect(formatExerciseKey('barbell_row')).toBe('Barbell Row')
    expect(formatExerciseKey('chin_up')).toBe('Chin-Up')
    expect(formatExerciseKey('close_grip_bench')).toBe('Close-Grip Bench Press')
    expect(formatExerciseKey('incline_bench')).toBe('Incline Bench Press')
    expect(formatExerciseKey('lat_pulldown')).toBe('Lat Pulldown')
    expect(formatExerciseKey('ohp')).toBe('Overhead Press')
    expect(formatExerciseKey('power_clean')).toBe('Power Clean')
    expect(formatExerciseKey('rdl')).toBe('Romanian Deadlift')
    expect(formatExerciseKey('sumo_deadlift')).toBe('Sumo Deadlift')
  })

  it('falls back to title-casing unknown exercise keys', () => {
    expect(formatExerciseKey('box_squat')).toBe('Box Squat')
    expect(formatExerciseKey('board_press')).toBe('Board Press')
  })
})

describe('roundToNearest', () => {
  it('rounds to nearest 5', () => {
    expect(roundToNearest(137, 5)).toBe(135)
    expect(roundToNearest(138, 5)).toBe(140)
  })

  it('rounds to nearest 2.5', () => {
    expect(roundToNearest(136, 2.5)).toBe(135)
    expect(roundToNearest(136.5, 2.5)).toBe(137.5)
  })

  it('returns exact value when already rounded', () => {
    expect(roundToNearest(135, 5)).toBe(135)
  })

  it('handles zero', () => {
    expect(roundToNearest(0, 5)).toBe(0)
  })

  it('supports converted kg values stored canonically in lbs', () => {
    expect(roundToNearest(displayToLbs(2.5, 'kg'), 0.5)).toBe(5.5)
  })
})

describe('roundToIncrement', () => {
  it('can round down to the lower increment', () => {
    expect(roundToIncrement(239.8, 5, 'down')).toBe(235)
  })

  it('can round up to the higher increment', () => {
    expect(roundToIncrement(239.8, 5, 'up')).toBe(240)
  })
})

describe('formatDate', () => {
  it('formats a date string', () => {
    const result = formatDate('2024-06-15T12:00:00Z')
    expect(result).toMatch(/Jun\s+15,\s+2024/)
  })

  it('treats date-only strings as local calendar dates', () => {
    const OriginalDate = Date
    const dateCalls: unknown[][] = []

    class DateSpy extends OriginalDate {
      constructor(...args: ConstructorParameters<DateConstructor>) {
        dateCalls.push([...args])
        super(...args)
      }
    }

    vi.stubGlobal('Date', DateSpy as unknown as DateConstructor)

    const result = formatDate('2024-06-15')

    expect(result).toMatch(/Jun\s+15,\s+2024/)
    expect(dateCalls).toContainEqual([2024, 5, 15])
    expect(dateCalls).not.toContainEqual(['2024-06-15'])
  })

  it('formats a Date object', () => {
    const result = formatDate(new Date(2024, 0, 15))
    expect(result).toMatch(/Jan/)
    expect(result).toMatch(/2024/)
  })
})

describe('formatDateAsLocalIso', () => {
  it('returns a zero-padded local calendar date', () => {
    expect(formatDateAsLocalIso(new Date(2026, 1, 3, 18, 45))).toBe('2026-02-03')
  })

  it('uses local date parts instead of UTC serialization', () => {
    expect(formatDateAsLocalIso(createMockDate('2026-02-03', '2026-02-02'))).toBe('2026-02-03')
  })
})
