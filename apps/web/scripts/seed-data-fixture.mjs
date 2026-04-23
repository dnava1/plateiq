const DAY_DEFINITIONS = [
  { key: 'ohp', label: 'OHP Day' },
  { key: 'deadlift', label: 'Deadlift Day' },
  { key: 'bench', label: 'Bench Day' },
  { key: 'squat', label: 'Squat Day' },
]

const DEFAULT_ROUNDING_LBS = 5

const DEFAULT_PROGRAM = {
  config: {
    rounding: DEFAULT_ROUNDING_LBS,
    tm_percentage: 0.9,
    variation_key: 'bbb',
  },
  name: 'Wendler 5/3/1 BBB',
  templateKey: 'wendler_531',
}

const DEFAULT_PROFILE = {
  displayName: 'Copilot Verify',
  preferredUnit: 'lbs',
  strengthProfileAgeYears: 30,
  strengthProfileBodyweightLbs: 181,
  strengthProfileSex: 'male',
  weightRoundingLbs: DEFAULT_ROUNDING_LBS,
}

const MAIN_SET_PRESCRIPTIONS = [
  { intensity: 0.65, intensityType: 'percentage_tm', isAmrap: false, reps: 5, setType: 'main' },
  { intensity: 0.75, intensityType: 'percentage_tm', isAmrap: false, reps: 5, setType: 'main' },
  { intensity: 0.85, intensityType: 'percentage_tm', isAmrap: true, reps: 5, setType: 'amrap' },
]

const BBB_SET_COUNT = 5
const BBB_INTENSITY = 0.5
const CYCLE_START_OFFSETS = [-84, -56, -18]
const DAY_SCHEDULE_OFFSETS = [0, 2, 4, 6]

const TRAINING_MAX_SNAPSHOTS = [
  { effectiveDateOffsetDays: CYCLE_START_OFFSETS[0], values: { bench: 185, deadlift: 315, ohp: 115, squat: 275 } },
  { effectiveDateOffsetDays: CYCLE_START_OFFSETS[1], values: { bench: 190, deadlift: 325, ohp: 120, squat: 285 } },
  { effectiveDateOffsetDays: CYCLE_START_OFFSETS[2], values: { bench: 190, deadlift: 335, ohp: 125, squat: 295 } },
]

const WEEK_INTENSITY_MODIFIERS = {
  1: 1,
  2: 1.0769,
  3: 1.1538,
  4: 0.6154,
}

const BASE_AMRAP_REPS = {
  bench: 8,
  deadlift: 7,
  ohp: 8,
  squat: 6,
}

const CYCLE_AMRAP_GROWTH = {
  bench: 0,
  deadlift: 1,
  ohp: 1,
  squat: 1,
}

const WEEK_AMRAP_ADJUSTMENT = {
  1: 0,
  2: -1,
  3: 1,
  4: -2,
}

const ACCESSORY_TEMPLATES_BY_DAY = {
  bench: [
    { exerciseKey: 'barbell_row', reps: 10, sets: 3, weightLbs: 165 },
    { exerciseKey: 'face_pull', reps: 15, sets: 3, weightLbs: 45 },
  ],
  deadlift: [
    { exerciseKey: 'lat_pulldown', reps: 12, sets: 3, weightLbs: 120 },
    { exerciseKey: 'ab_wheel_rollout', reps: 10, sets: 3, weightLbs: 15 },
  ],
  ohp: [
    { exerciseKey: 'barbell_row', reps: 10, sets: 3, weightLbs: 155 },
    { exerciseKey: 'hanging_leg_raise', reps: 12, sets: 3, weightLbs: 20 },
  ],
  squat: [
    { exerciseKey: 'bulgarian_split_squat', reps: 10, sets: 3, weightLbs: 95 },
    { exerciseKey: 'hanging_leg_raise', reps: 12, sets: 3, weightLbs: 20 },
  ],
}

const BODYWEIGHT_VERIFICATION_TEMPLATES_BY_DAY = {
  bench: {
    strictExerciseKey: 'dip',
    strictBaseReps: 10,
    weightedBaseAddedLbs: 15,
    weightedExerciseKey: 'weighted_dip',
    weightedReps: 5,
  },
  deadlift: {
    strictExerciseKey: 'pull_up',
    strictBaseReps: 8,
    weightedBaseAddedLbs: 5,
    weightedExerciseKey: 'weighted_pull_up',
    weightedReps: 5,
  },
  ohp: {
    strictExerciseKey: 'chin_up',
    strictBaseReps: 9,
    weightedBaseAddedLbs: 5,
    weightedExerciseKey: 'weighted_chin_up',
    weightedReps: 5,
  },
}

const BODYWEIGHT_WEIGHTED_INCREMENT_LBS = 5
const BODYWEIGHT_STRICT_PROGRESS_INTERVAL = 4

export const DEFAULT_VERIFICATION_EMAIL = 'copilot.verify@plateiq.local'

function createUtcReferenceDay(input = new Date()) {
  const date = new Date(input)
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0))
}

function addDays(date, days) {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function addMinutes(isoTimestamp, minutes) {
  const date = new Date(isoTimestamp)
  date.setUTCMinutes(date.getUTCMinutes() + minutes)
  return date.toISOString()
}

function toDateString(date) {
  return date.toISOString().slice(0, 10)
}

function toTimestamp(date, hour, minute) {
  const stamp = new Date(date.getTime())
  stamp.setUTCHours(hour, minute, 0, 0)
  return stamp.toISOString()
}

function roundToNearest(value, increment) {
  if (!Number.isFinite(value) || !Number.isFinite(increment) || increment <= 0) {
    return value
  }

  return Math.round(value / increment) * increment
}

function getScheduledOffset(weekNumber, dayIndex) {
  return ((weekNumber - 1) * 7) + DAY_SCHEDULE_OFFSETS[dayIndex]
}

function getAmrapReps(dayKey, cycleNumber, weekNumber) {
  const base = BASE_AMRAP_REPS[dayKey]
  const cycleGrowth = CYCLE_AMRAP_GROWTH[dayKey]
  const weekAdjustment = WEEK_AMRAP_ADJUSTMENT[weekNumber] ?? 0
  return Math.max(5, base + ((cycleNumber - 1) * cycleGrowth) + weekAdjustment)
}

export function getExerciseLookupKeys(value) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  const lookups = new Set([normalized])

  if (normalized.endsWith('_press')) {
    lookups.add(normalized.replace(/_press$/, ''))
  }

  if (normalized === 'bench_press') {
    lookups.add('bench')
  }

  if (normalized === 'overhead_press') {
    lookups.add('ohp')
  }

  return Array.from(lookups)
}

export function createExerciseIdMap(exercises) {
  const lookup = new Map()

  for (const exercise of exercises) {
    for (const key of getExerciseLookupKeys(exercise.name)) {
      if (!lookup.has(key)) {
        lookup.set(key, exercise.id)
      }
    }
  }

  return lookup
}

export function generateWendler531BbbSets(dayKey, weekNumber, trainingMaxes, roundingLbs = DEFAULT_ROUNDING_LBS) {
  const trainingMax = trainingMaxes[dayKey]
  const weekModifier = WEEK_INTENSITY_MODIFIERS[weekNumber] ?? 1

  if (!trainingMax) {
    throw new Error(`Missing training max for ${dayKey}.`)
  }

  const sets = []
  let setOrder = 1

  for (const prescription of MAIN_SET_PRESCRIPTIONS) {
    sets.push({
      exerciseKey: dayKey,
      intensityType: prescription.intensityType,
      isAmrap: prescription.isAmrap,
      repsPrescribed: prescription.reps,
      repsPrescribedMax: null,
      setOrder,
      setType: prescription.setType,
      weightLbs: roundToNearest(trainingMax * prescription.intensity * weekModifier, roundingLbs),
    })
    setOrder += 1
  }

  const variationWeight = roundToNearest(trainingMax * BBB_INTENSITY, roundingLbs)

  for (let index = 0; index < BBB_SET_COUNT; index += 1) {
    sets.push({
      exerciseKey: dayKey,
      intensityType: 'percentage_tm',
      isAmrap: false,
      repsPrescribed: 10,
      repsPrescribedMax: null,
      setOrder,
      setType: 'variation',
      weightLbs: variationWeight,
    })
    setOrder += 1
  }

  return sets
}

function buildAccessorySets(dayKey, startOrder, loggedAtBase, cycleNumber, weekNumber) {
  const accessories = ACCESSORY_TEMPLATES_BY_DAY[dayKey] ?? []
  const sets = []
  let setOrder = startOrder

  for (const accessory of accessories) {
    for (let index = 0; index < accessory.sets; index += 1) {
      sets.push({
        exerciseKey: accessory.exerciseKey,
        intensityType: 'fixed_weight',
        isAmrap: false,
        loggedAt: addMinutes(loggedAtBase, (setOrder - 1) * 4),
        repsActual: accessory.reps,
        repsPrescribed: accessory.reps,
        repsPrescribedMax: null,
        setOrder,
        setType: 'accessory',
        weightLbs: accessory.weightLbs,
      })
      setOrder += 1
    }
  }

  const bodyweightVerificationTemplate = BODYWEIGHT_VERIFICATION_TEMPLATES_BY_DAY[dayKey]

  if (bodyweightVerificationTemplate) {
    const exposureIndex = ((cycleNumber - 1) * 4) + (weekNumber - 1)
    const strictReps = bodyweightVerificationTemplate.strictBaseReps
      + Math.floor(exposureIndex / BODYWEIGHT_STRICT_PROGRESS_INTERVAL)
    const weightedAddedLbs = bodyweightVerificationTemplate.weightedBaseAddedLbs
      + (exposureIndex * BODYWEIGHT_WEIGHTED_INCREMENT_LBS)

    sets.push({
      exerciseKey: bodyweightVerificationTemplate.strictExerciseKey,
      intensityType: 'bodyweight',
      isAmrap: false,
      loggedAt: addMinutes(loggedAtBase, (setOrder - 1) * 4),
      repsActual: strictReps,
      repsPrescribed: strictReps,
      repsPrescribedMax: null,
      setOrder,
      setType: 'accessory',
      weightLbs: 0,
    })
    setOrder += 1

    sets.push({
      exerciseKey: bodyweightVerificationTemplate.weightedExerciseKey,
      intensityType: 'fixed_weight',
      isAmrap: false,
      loggedAt: addMinutes(loggedAtBase, (setOrder - 1) * 4),
      repsActual: bodyweightVerificationTemplate.weightedReps,
      repsPrescribed: bodyweightVerificationTemplate.weightedReps,
      repsPrescribedMax: null,
      setOrder,
      setType: 'accessory',
      weightLbs: weightedAddedLbs,
    })
    setOrder += 1
  }

  return sets
}

function materializeWorkoutSets({
  amrapActual,
  completedSetOrders,
  cycleNumber,
  dayKey,
  generatedSets,
  includeAccessories,
  loggedAtBase,
  weekNumber,
  weightAdjustmentsByOrder,
}) {
  const loggedOrderSet = completedSetOrders ? new Set(completedSetOrders) : null
  const sets = generatedSets.map((set) => {
    const isLogged = loggedOrderSet ? loggedOrderSet.has(set.setOrder) : true
    const repsActual = !isLogged
      ? null
      : set.setType === 'amrap'
        ? amrapActual
        : set.repsPrescribed

    return {
      ...set,
      loggedAt: repsActual === null ? null : addMinutes(loggedAtBase, (set.setOrder - 1) * 4),
      repsActual,
      weightLbs: set.weightLbs + (weightAdjustmentsByOrder?.[set.setOrder] ?? 0),
    }
  })

  if (!includeAccessories) {
    return sets
  }

  return [...sets, ...buildAccessorySets(dayKey, generatedSets.length + 1, loggedAtBase, cycleNumber, weekNumber)]
}

function createWorkout({
  amrapActual,
  completedAt,
  cycleNumber,
  day,
  includeAccessories,
  notes,
  referenceDay,
  startedAt,
  trainingMaxes,
  weekNumber,
  weightAdjustmentsByOrder,
  completedSetOrders,
}) {
  const scheduledDate = addDays(referenceDay, getScheduledOffset(weekNumber, day.dayIndex))
  const generatedSets = generateWendler531BbbSets(day.key, weekNumber, trainingMaxes, DEFAULT_ROUNDING_LBS)

  return {
    completedAt,
    cycleNumber,
    dayKey: day.key,
    dayLabel: day.label,
    notes,
    scheduledDate: toDateString(scheduledDate),
    sets: materializeWorkoutSets({
      amrapActual,
      completedSetOrders,
      cycleNumber,
      dayKey: day.key,
      generatedSets,
      includeAccessories,
      loggedAtBase: startedAt,
      weekNumber,
      weightAdjustmentsByOrder,
    }),
    startedAt,
    weekNumber,
  }
}

function buildCompletedCycle(cycleNumber, referenceDay, trainingMaxes) {
  const cycleStart = addDays(referenceDay, CYCLE_START_OFFSETS[cycleNumber - 1])
  const workouts = []

  for (let weekNumber = 1; weekNumber <= 4; weekNumber += 1) {
    for (let dayIndex = 0; dayIndex < DAY_DEFINITIONS.length; dayIndex += 1) {
      const day = { ...DAY_DEFINITIONS[dayIndex], dayIndex }
      const scheduledDate = addDays(cycleStart, getScheduledOffset(weekNumber, dayIndex))
      const startedAt = toTimestamp(scheduledDate, 17, 15)
      const completedAt = toTimestamp(scheduledDate, 18, 40)

      workouts.push(createWorkout({
        amrapActual: getAmrapReps(day.key, cycleNumber, weekNumber),
        completedAt,
        cycleNumber,
        day,
        includeAccessories: true,
        notes: `${day.label} completed during verification seed cycle ${cycleNumber}.`,
        referenceDay: cycleStart,
        startedAt,
        trainingMaxes,
        weekNumber,
      }))
    }
  }

  return {
    autoProgressionApplied: true,
    completedAt: workouts[workouts.length - 1]?.completedAt ?? null,
    cycleNumber,
    startDate: toDateString(cycleStart),
    workouts,
  }
}

function buildActiveCycle(referenceDay, trainingMaxes) {
  const cycleNumber = 3
  const cycleStart = addDays(referenceDay, CYCLE_START_OFFSETS[2])
  const workouts = []

  for (let weekNumber = 1; weekNumber <= 2; weekNumber += 1) {
    for (let dayIndex = 0; dayIndex < DAY_DEFINITIONS.length; dayIndex += 1) {
      const day = { ...DAY_DEFINITIONS[dayIndex], dayIndex }
      const scheduledDate = addDays(cycleStart, getScheduledOffset(weekNumber, dayIndex))
      const startedAt = toTimestamp(scheduledDate, 17, 10)
      const completedAt = toTimestamp(scheduledDate, 18, 20)

      workouts.push(createWorkout({
        amrapActual: day.key === 'bench' ? null : getAmrapReps(day.key, cycleNumber, weekNumber),
        completedAt,
        cycleNumber,
        day,
        includeAccessories: true,
        notes: day.key === 'bench'
          ? 'Bench day marked complete without an AMRAP effort to preserve the current stall signal.'
          : `${day.label} completed in the active verification cycle.`,
        referenceDay: cycleStart,
        startedAt,
        trainingMaxes,
        weekNumber,
      }))
    }
  }

  for (let dayIndex = 0; dayIndex < 2; dayIndex += 1) {
    const day = { ...DAY_DEFINITIONS[dayIndex], dayIndex }
    const weekNumber = 3
    const scheduledDate = addDays(cycleStart, getScheduledOffset(weekNumber, dayIndex))
    const startedAt = toTimestamp(scheduledDate, 17, 20)
    const completedAt = toTimestamp(scheduledDate, 18, 25)

    workouts.push(createWorkout({
      amrapActual: getAmrapReps(day.key, cycleNumber, weekNumber),
      completedAt,
      cycleNumber,
      day,
      includeAccessories: true,
      notes: `${day.label} completed in the active verification cycle.`,
      referenceDay: cycleStart,
      startedAt,
      trainingMaxes,
      weekNumber,
    }))
  }

  const benchDay = { ...DAY_DEFINITIONS[2], dayIndex: 2 }
  const incompleteScheduledDate = addDays(cycleStart, getScheduledOffset(3, benchDay.dayIndex))
  const incompleteStartedAt = toTimestamp(incompleteScheduledDate, 18, 5)

  workouts.push(createWorkout({
    amrapActual: null,
    completedAt: null,
    completedSetOrders: [1, 2, 4, 5],
    cycleNumber,
    day: benchDay,
    includeAccessories: false,
    notes: 'Paused mid-session after load adjustments on the bench work and BBB volume.',
    referenceDay: cycleStart,
    startedAt: incompleteStartedAt,
    trainingMaxes,
    weekNumber: 3,
    weightAdjustmentsByOrder: {
      1: 5,
      2: -5,
      4: 5,
      5: 5,
    },
  }))

  return {
    autoProgressionApplied: false,
    completedAt: null,
    cycleNumber,
    startDate: toDateString(cycleStart),
    workouts,
  }
}

export function buildSeedDataPlan(referenceDate = new Date()) {
  const referenceDay = createUtcReferenceDay(referenceDate)
  const trainingMaxes = TRAINING_MAX_SNAPSHOTS.flatMap((snapshot) => {
    const effectiveDate = toDateString(addDays(referenceDay, snapshot.effectiveDateOffsetDays))

    return Object.entries(snapshot.values).map(([exerciseKey, weightLbs]) => ({
      effectiveDate,
      exerciseKey,
      tmPercentage: DEFAULT_PROGRAM.config.tm_percentage,
      weightLbs,
    }))
  })

  const cycles = [
    buildCompletedCycle(1, referenceDay, TRAINING_MAX_SNAPSHOTS[0].values),
    buildCompletedCycle(2, referenceDay, TRAINING_MAX_SNAPSHOTS[1].values),
    buildActiveCycle(referenceDay, TRAINING_MAX_SNAPSHOTS[2].values),
  ]

  return {
    profile: DEFAULT_PROFILE,
    program: {
      ...DEFAULT_PROGRAM,
      startDate: cycles[0].startDate,
    },
    trainingMaxes,
    cycles,
  }
}

export function summarizeSeedDataPlan(plan) {
  const workouts = plan.cycles.flatMap((cycle) => cycle.workouts)
  const sets = workouts.flatMap((workout) => workout.sets)
  const benchPrDates = workouts
    .filter((workout) => workout.dayKey === 'bench')
    .filter((workout) => workout.sets.some((set) => set.setType === 'amrap' && set.repsActual !== null))
    .map((workout) => workout.scheduledDate)

  return {
    completedWorkoutCount: workouts.filter((workout) => workout.completedAt !== null).length,
    incompleteWorkoutCount: workouts.filter((workout) => workout.completedAt === null).length,
    lastBenchPrDate: benchPrDates.at(-1) ?? null,
    loggedSetCount: sets.filter((set) => set.repsActual !== null).length,
    totalCycles: plan.cycles.length,
    totalSets: sets.length,
    totalTrainingMaxes: plan.trainingMaxes.length,
    totalWorkouts: workouts.length,
  }
}