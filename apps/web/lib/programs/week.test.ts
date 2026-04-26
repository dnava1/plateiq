import { describe, expect, it } from 'vitest'
import { getTemplate } from '@/lib/constants/templates'
import {
  collapseProgramWeekSpecificDays,
  hasProgramWeekSpecificDays,
  materializeProgramWeekSpecificDays,
  normalizeProgramStructure,
  resolveEditableProgramDaySlots,
  resolveProgramDays,
  resolveProgramWeekLabel,
  updateProgramWeekLabel,
  updateProgramDay,
} from './week'

describe('resolveProgramDays', () => {
  it('returns explicit week-specific days when provided', () => {
    const template = getTemplate('wendler_531')
    const weekThreeDays = resolveProgramDays(template!, 3)

    expect(weekThreeDays[3]?.exercise_blocks[0]?.sets.map((set) => set.reps)).toEqual([5, 3, '1+'])
  })
})

describe('resolveEditableProgramDaySlots', () => {
  it('uses the base day list once when no week-specific days exist', () => {
    const template = getTemplate('smolov_jr')
    const slots = resolveEditableProgramDaySlots(template!)

    expect(hasProgramWeekSpecificDays(template!)).toBe(false)
    expect(slots).toHaveLength(template!.days.length)
    expect(slots.every((slot) => slot.weekNumber === 1)).toBe(true)
  })

  it('flattens the full cycle when explicit week layouts exist', () => {
    const template = getTemplate('starting_strength')
    const slots = resolveEditableProgramDaySlots(template!)

    expect(hasProgramWeekSpecificDays(template!)).toBe(true)
    expect(slots).toHaveLength(6)
    expect(slots.map((slot) => `${slot.weekNumber}:${slot.day.label}`)).toEqual([
      '1:Workout A',
      '1:Workout B',
      '1:Workout A',
      '2:Workout B',
      '2:Workout A',
      '2:Workout B',
    ])
  })
})

describe('updateProgramDay', () => {
  it('updates the base day list for shared week structures', () => {
    const template = getTemplate('smolov_jr')!

    const result = updateProgramDay(
      template,
      {
        dayIndex: 1,
        usesWeekSpecificDays: false,
        weekNumber: 1,
      },
      {
        ...template.days[1],
        label: 'Session 2 - Edited',
      },
    )

    expect(result.days[1]?.label).toBe('Session 2 - Edited')
    expect(result.week_schemes).toBe(template.week_schemes)
  })

  it('updates week-specific day definitions without mutating the base day list', () => {
    const template = getTemplate('wendler_531')!
    const weekThreeSquatDay = template.week_schemes?.['3']?.days?.[3]
    expect(weekThreeSquatDay).toBeDefined()

    const result = updateProgramDay(
      template,
      {
        dayIndex: 3,
        usesWeekSpecificDays: true,
        weekNumber: 3,
      },
      {
        ...(weekThreeSquatDay as NonNullable<typeof weekThreeSquatDay>),
        label: 'Week 3 Squat PR Day',
      },
    )

    expect(result.days[3]?.label).toBe('Squat Day')
    expect(result.week_schemes?.['3']?.days?.[3]?.label).toBe('Week 3 Squat PR Day')
  })
})

describe('normalizeProgramStructure', () => {
  it('resizes explicit week layouts to the selected days per week and trims extra week schemes', () => {
    const template = getTemplate('starting_strength')!

    const normalized = normalizeProgramStructure({
      ...template,
      cycle_length_weeks: 1,
      days_per_week: 2,
    })

    expect(normalized.days).toHaveLength(2)
    expect(normalized.week_schemes?.['2']).toBeUndefined()
  })

  it('collapses week-specific days back into the base layout for one-week cycles', () => {
    const template = getTemplate('starting_strength')!

    const normalized = normalizeProgramStructure({
      ...template,
      cycle_length_weeks: 1,
      days_per_week: 3,
    })

    expect(hasProgramWeekSpecificDays({
      ...template,
      cycle_length_weeks: 1,
      week_schemes: normalized.week_schemes,
    })).toBe(false)
    expect(normalized.days[0]?.label).toBe('Workout A')
    expect(normalized.week_schemes?.['1']?.days).toBeUndefined()
  })
})

describe('materializeProgramWeekSpecificDays', () => {
  it('creates editable week-specific day layouts for every week in the cycle', () => {
    const template = getTemplate('smolov_jr')!

    const materialized = materializeProgramWeekSpecificDays({
      ...template,
      days_per_week: template.days.length,
    })

    expect(materialized.week_schemes?.['1']?.days).toHaveLength(template.days.length)
    expect(materialized.week_schemes?.['3']?.days).toHaveLength(template.days.length)
    expect(materialized.week_schemes?.['2']?.days?.[0]).not.toBe(materialized.week_schemes?.['1']?.days?.[0])
  })
})

describe('updateProgramWeekLabel', () => {
  it('updates a single week label without dropping its day definitions', () => {
    const template = getTemplate('starting_strength')!

    const result = updateProgramWeekLabel(template, 2, 'Week 2 - Heavy')

    expect(result.week_schemes?.['2']?.label).toBe('Week 2 - Heavy')
    expect(result.week_schemes?.['2']?.days).toEqual(template.week_schemes?.['2']?.days)
  })

  it('falls back to a default week label when the saved label is blank', () => {
    const template = getTemplate('starting_strength')!

    const result = updateProgramWeekLabel(template, 2, '')

    expect(result.week_schemes?.['2']?.label).toBe('')
    expect(resolveProgramWeekLabel({
      ...template,
      week_schemes: {
        ...template.week_schemes,
        2: result.week_schemes?.['2'] ?? template.week_schemes?.['2'],
      },
    }, 2)).toBe('Week 2')
  })
})

describe('collapseProgramWeekSpecificDays', () => {
  it('turns week-specific overrides back into a shared layout using week one as the base', () => {
    const template = getTemplate('starting_strength')!

    const result = collapseProgramWeekSpecificDays({
      ...template,
      days_per_week: 3,
    })

    expect(result.days[0]?.label).toBe('Workout A')
    expect(result.week_schemes?.['2']?.days).toBeUndefined()
  })
})
