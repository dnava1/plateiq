import { describe, expect, it } from 'vitest'
import { getTemplate } from '@/lib/constants/templates'
import {
  hasProgramWeekSpecificDays,
  normalizeProgramStructure,
  resolveEditableProgramDaySlots,
  resolveProgramDays,
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
})
