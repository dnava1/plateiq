import type { DayTemplate, ProgramTemplate } from '@/types/template'

type WeekAwareProgram = Pick<ProgramTemplate, 'cycle_length_weeks' | 'days' | 'week_schemes'>
type ProgramWeekSchemesMap = NonNullable<WeekAwareProgram['week_schemes']>

export interface EditableProgramDaySlot {
  cycleDayIndex: number
  day: DayTemplate
  dayIndex: number
  usesWeekSpecificDays: boolean
  weekLabel: string
  weekNumber: number
}

function resolveWeekLabelValue(label: string | undefined, weekNumber: number): string {
  return label?.trim().length ? label.trim() : `Week ${weekNumber}`
}

function stripWeekSpecificDayEntries<T extends WeekAwareProgram['week_schemes']>(weekSchemes: T): T {
  if (!weekSchemes) {
    return weekSchemes
  }

  return Object.fromEntries(
    Object.entries(weekSchemes).map(([weekNumber, scheme]) => [
      weekNumber,
      {
        ...scheme,
        days: undefined,
      },
    ]),
  ) as T
}

export function resolveProgramDays(program: WeekAwareProgram, weekNumber: number): DayTemplate[] {
  return program.week_schemes?.[weekNumber]?.days ?? program.days
}

export function resolveProgramDay(program: WeekAwareProgram, dayIndex: number, weekNumber: number): DayTemplate | undefined {
  return resolveProgramDays(program, weekNumber)[dayIndex]
}

export function countProgramPlannedWorkouts(program: WeekAwareProgram): number {
  let totalPlannedWorkouts = 0

  for (let weekNumber = 1; weekNumber <= program.cycle_length_weeks; weekNumber += 1) {
    totalPlannedWorkouts += resolveProgramDays(program, weekNumber).length
  }

  return totalPlannedWorkouts
}

export function collectProgramDays(program: WeekAwareProgram): DayTemplate[] {
  const allDays = [...program.days]

  for (let weekNumber = 1; weekNumber <= program.cycle_length_weeks; weekNumber += 1) {
    const days = program.week_schemes?.[weekNumber]?.days

    if (days) {
      allDays.push(...days)
    }
  }

  return allDays
}

export function hasProgramWeekSpecificDays(program: WeekAwareProgram): boolean {
  if (program.cycle_length_weeks <= 1) {
    return false
  }

  return Object.values(program.week_schemes ?? {}).some((scheme) => Boolean(scheme.days?.length))
}

export function resolveProgramWeekLabel(program: WeekAwareProgram, weekNumber: number): string {
  return resolveWeekLabelValue(program.week_schemes?.[weekNumber]?.label, weekNumber)
}

export function resolveEditableProgramDaySlots(program: WeekAwareProgram): EditableProgramDaySlot[] {
  if (!hasProgramWeekSpecificDays(program)) {
    return program.days.map((day, dayIndex) => ({
      cycleDayIndex: dayIndex,
      day,
      dayIndex,
      usesWeekSpecificDays: false,
      weekLabel: resolveProgramWeekLabel(program, 1),
      weekNumber: 1,
    }))
  }

  const slots: EditableProgramDaySlot[] = []
  let cycleDayIndex = 0

  for (let weekNumber = 1; weekNumber <= program.cycle_length_weeks; weekNumber += 1) {
    const days = resolveProgramDays(program, weekNumber)
    const usesWeekSpecificDays = Boolean(program.week_schemes?.[weekNumber]?.days)

    for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
      slots.push({
        cycleDayIndex,
        day: days[dayIndex],
        dayIndex,
        usesWeekSpecificDays,
        weekLabel: resolveProgramWeekLabel(program, weekNumber),
        weekNumber,
      })
      cycleDayIndex += 1
    }
  }

  return slots
}

function createNormalizedDayTemplate(day: DayTemplate | undefined, dayIndex: number): DayTemplate {
  return {
    label: day?.label ?? `Day ${dayIndex + 1}`,
    exercise_blocks: day?.exercise_blocks ?? [],
  }
}

function cloneDayTemplate(day: DayTemplate): DayTemplate {
  return {
    ...day,
    exercise_blocks: day.exercise_blocks.map((block) => ({
      ...block,
      sets: block.sets.map((set) => ({ ...set })),
    })),
  }
}

export function normalizeProgramStructure<
  T extends WeekAwareProgram & Pick<ProgramTemplate, 'days_per_week'>
>(program: T): Pick<T, 'days' | 'week_schemes'> {
  const normalizedDays = Array.from({ length: program.days_per_week }, (_, dayIndex) =>
    createNormalizedDayTemplate(program.days[dayIndex], dayIndex),
  )

  const normalizedWeekSchemes: ProgramWeekSchemesMap | undefined = program.week_schemes
    ? Object.fromEntries(
        Object.entries(program.week_schemes)
          .filter(([weekNumber]) => {
            const parsedWeekNumber = Number(weekNumber)
            return Number.isInteger(parsedWeekNumber)
              && parsedWeekNumber >= 1
              && parsedWeekNumber <= program.cycle_length_weeks
          })
          .map(([weekNumber, scheme]) => [
            weekNumber,
            {
              ...scheme,
              days: scheme.days
                ? Array.from({ length: program.days_per_week }, (_, dayIndex) =>
                    createNormalizedDayTemplate(scheme.days?.[dayIndex] ?? normalizedDays[dayIndex], dayIndex),
                  )
                : undefined,
            },
          ]),
      ) as ProgramWeekSchemesMap
    : undefined

  if (program.cycle_length_weeks <= 1) {
    const collapsedDays = (normalizedWeekSchemes?.[1]?.days ?? normalizedDays).map(cloneDayTemplate)

    return {
      days: collapsedDays as T['days'],
      week_schemes: stripWeekSpecificDayEntries(normalizedWeekSchemes) as T['week_schemes'],
    }
  }

  return {
    days: normalizedDays as T['days'],
    week_schemes: normalizedWeekSchemes as T['week_schemes'],
  }
}

export function updateProgramDay(
  program: WeekAwareProgram,
  slot: Pick<EditableProgramDaySlot, 'dayIndex' | 'usesWeekSpecificDays' | 'weekNumber'>,
  day: DayTemplate,
): Pick<WeekAwareProgram, 'days' | 'week_schemes'> {
  if (!slot.usesWeekSpecificDays) {
    const nextDays = [...program.days]
    nextDays[slot.dayIndex] = day

    return {
      days: nextDays,
      week_schemes: program.week_schemes,
    }
  }

  const targetScheme = program.week_schemes?.[slot.weekNumber]
  const targetDays = targetScheme?.days ?? []
  const nextWeekScheme = {
    ...targetScheme,
    label: targetScheme?.label ?? `Week ${slot.weekNumber}`,
    days: [...targetDays],
  }
  const nextWeekSchemes: ProgramWeekSchemesMap = {
    ...(program.week_schemes ?? {}),
    [slot.weekNumber]: nextWeekScheme,
  }

  nextWeekScheme.days[slot.dayIndex] = day

  return {
    days: program.days,
    week_schemes: nextWeekSchemes,
  }
}

export function materializeProgramWeekSpecificDays<
  T extends WeekAwareProgram & Pick<ProgramTemplate, 'days_per_week'>
>(program: T): Pick<T, 'days' | 'week_schemes'> {
  const normalizedProgram = normalizeProgramStructure(program)

  const nextWeekSchemes = Object.fromEntries(
    Array.from({ length: program.cycle_length_weeks }, (_, index) => {
      const weekNumber = index + 1
      const existingDays = normalizedProgram.week_schemes?.[weekNumber]?.days ?? normalizedProgram.days

      return [
        String(weekNumber),
        {
          label: resolveProgramWeekLabel(program, weekNumber),
          days: existingDays.map(cloneDayTemplate),
        },
      ]
    }),
  ) as ProgramWeekSchemesMap

  return {
    days: normalizedProgram.days as T['days'],
    week_schemes: nextWeekSchemes as T['week_schemes'],
  }
}

export function collapseProgramWeekSpecificDays<
  T extends WeekAwareProgram & Pick<ProgramTemplate, 'days_per_week'>
>(program: T): Pick<T, 'days' | 'week_schemes'> {
  const normalizedProgram = normalizeProgramStructure(program)
  const nextDays = (normalizedProgram.week_schemes?.[1]?.days ?? normalizedProgram.days).map(cloneDayTemplate)

  return {
    days: nextDays as T['days'],
    week_schemes: stripWeekSpecificDayEntries(normalizedProgram.week_schemes) as T['week_schemes'],
  }
}

export function updateProgramWeekLabel(
  program: WeekAwareProgram,
  weekNumber: number,
  label: string,
): Pick<WeekAwareProgram, 'week_schemes'> {
  const targetScheme = program.week_schemes?.[weekNumber]

  return {
    week_schemes: {
      ...(program.week_schemes ?? {}),
      [weekNumber]: {
        ...targetScheme,
        label,
        days: targetScheme?.days,
      },
    } as ProgramWeekSchemesMap,
  }
}

export function collectProgramExerciseKeys(program: WeekAwareProgram): string[] {
  const exerciseKeys = new Set<string>()

  const collectExerciseKeys = (days: DayTemplate[]) => {
    for (const day of days) {
      for (const block of day.exercise_blocks) {
        if (block.exercise_key) {
          exerciseKeys.add(block.exercise_key)
        }
      }
    }
  }

  collectExerciseKeys(collectProgramDays(program))

  return Array.from(exerciseKeys)
}
