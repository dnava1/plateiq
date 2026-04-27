import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  buildSeedDataPlan,
  createExerciseIdMap,
  DEFAULT_VERIFICATION_EMAIL,
  summarizeSeedDataPlan,
} from './seed-data-fixture.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appDir = path.resolve(__dirname, '..')

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return
  }

  const content = readFileSync(filePath, 'utf8')

  for (const line of content.split(/\r?\n/u)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmed.indexOf('=')

    if (separatorIndex <= 0) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

function loadLocalEnvFiles() {
  loadEnvFile(path.join(appDir, '.env.local'))
  loadEnvFile(path.join(appDir, '.env'))
}

function getRequiredEnv(name) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function getCliOptionValue(args, optionName) {
  const optionIndex = args.indexOf(optionName)

  if (optionIndex === -1) {
    return null
  }

  return args[optionIndex + 1] ?? null
}

export function getCliOptionValues(args, optionName) {
  const values = []

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === optionName && args[index + 1]) {
      values.push(args[index + 1])
      index += 1
    }
  }

  return values
}

export function getAdditionalSeedEmails({
  args = process.argv.slice(2),
  env = process.env,
  verificationEmail,
}) {
  const cliEmails = getCliOptionValues(args, '--extra-email')
  const envEmails = (env.SEED_EXTRA_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return Array.from(new Set([...cliEmails, ...envEmails]))
    .filter((email) => email.toLowerCase() !== verificationEmail.toLowerCase())
}

function isHostedSupabaseUrl(supabaseUrl) {
  const hostname = new URL(supabaseUrl).hostname.toLowerCase()
  return hostname !== 'localhost' && hostname !== '127.0.0.1'
}

export function getSupabaseProjectRef(supabaseUrl) {
  const hostname = new URL(supabaseUrl).hostname.toLowerCase()

  if (hostname.endsWith('.supabase.co')) {
    return hostname.replace(/\.supabase\.co$/u, '')
  }

  return hostname
}

export function assertHostedSeedAuthorization({
  args = process.argv.slice(2),
  env = process.env,
  supabaseUrl,
  verificationEmail,
}) {
  const allowHostedSeed = args.includes('--allow-hosted-dev') || env.PLATEIQ_ALLOW_HOSTED_DEV_SEED === 'true'

  if (!isHostedSupabaseUrl(supabaseUrl)) {
    return {
      isHostedProject: false,
      projectRef: null,
    }
  }

  if (!allowHostedSeed) {
    throw new Error(
      'Refusing to reseed a hosted Supabase project without explicit opt-in. Re-run with --allow-hosted-dev.',
    )
  }

  const actualProjectRef = getSupabaseProjectRef(supabaseUrl)
  const confirmedProjectRef = getCliOptionValue(args, '--project-ref') ?? env.PLATEIQ_HOSTED_DEV_PROJECT_REF ?? null
  const confirmedEmail = getCliOptionValue(args, '--confirm-email') ?? env.PLATEIQ_SEED_CONFIRM_EMAIL ?? null

  if (!confirmedProjectRef) {
    throw new Error(
      'Hosted reseeds require --project-ref <project-ref> or PLATEIQ_HOSTED_DEV_PROJECT_REF.',
    )
  }

  if (confirmedProjectRef !== actualProjectRef) {
    throw new Error(
      `Hosted reseed project ref mismatch. Expected ${actualProjectRef}, received ${confirmedProjectRef}.`,
    )
  }

  if (!confirmedEmail) {
    throw new Error(
      'Hosted reseeds require --confirm-email <verification-email> or PLATEIQ_SEED_CONFIRM_EMAIL.',
    )
  }

  if (confirmedEmail.toLowerCase() !== verificationEmail.toLowerCase()) {
    throw new Error(
      `Hosted reseed confirmation email mismatch. Expected ${verificationEmail}, received ${confirmedEmail}.`,
    )
  }

  return {
    isHostedProject: true,
    projectRef: actualProjectRef,
  }
}

function createAdminClient({ args, env, verificationEmail }) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.')
  }

  assertHostedSeedAuthorization({
    args,
    env,
    supabaseUrl,
    verificationEmail,
  })

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function findUserByEmail(admin, email) {
  let page = 1
  const perPage = 200
  const normalizedEmail = email.toLowerCase()

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })

    if (error) {
      throw error
    }

    const user = data.users.find((entry) => entry.email?.toLowerCase() === normalizedEmail)

    if (user) {
      return user
    }

    if (data.users.length < perPage) {
      return null
    }

    page += 1
  }
}

export async function ensureVerificationUser(admin, email, password) {
  const userMetadata = {
    full_name: 'Copilot Verify',
    name: 'Copilot Verify',
  }

  const existingUser = await findUserByEmail(admin, email)

  if (!existingUser) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
      user_metadata: userMetadata,
    })

    if (error) {
      throw error
    }

    return data.user
  }

  const { data, error } = await admin.auth.admin.updateUserById(existingUser.id, {
    email,
    email_confirm: true,
    password,
    user_metadata: userMetadata,
  })

  if (error) {
    throw error
  }

  return data.user
}

export async function requireExistingUser(admin, email) {
  const user = await findUserByEmail(admin, email)

  if (!user) {
    throw new Error(`Could not find an existing Supabase user for ${email}.`)
  }

  return user
}

function getSeedDisplayName(user, fallbackEmail, defaultDisplayName = 'Copilot Verify') {
  const metadata = user?.user_metadata && typeof user.user_metadata === 'object'
    ? user.user_metadata
    : null
  const fullName = typeof metadata?.full_name === 'string' && metadata.full_name.trim().length > 0
    ? metadata.full_name.trim()
    : null
  const name = typeof metadata?.name === 'string' && metadata.name.trim().length > 0
    ? metadata.name.trim()
    : null

  return fullName ?? name ?? defaultDisplayName ?? fallbackEmail
}

/**
 * @param {{ extraEmails?: string[]; verificationEmail: string; verificationPassword: string }} options
 */
export async function resolveSeedTargets(admin, options) {
  const extraEmails = options.extraEmails ?? []
  const { verificationEmail, verificationPassword } = options
  const verificationUser = await ensureVerificationUser(admin, verificationEmail, verificationPassword)
  const targets = [{
    email: verificationEmail,
    user: verificationUser,
    displayName: 'Copilot Verify',
  }]

  for (const email of extraEmails) {
    const user = await requireExistingUser(admin, email)
    targets.push({
      email,
      user,
      displayName: getSeedDisplayName(user, email),
    })
  }

  return targets
}

export async function resetUserData(admin, userId) {
  const deleteByUserId = async (table) => {
    const { error } = await admin.from(table).delete().eq('user_id', userId)
    if (error) {
      throw error
    }
  }

  await deleteByUserId('workout_sets')
  await deleteByUserId('workouts')
  await deleteByUserId('cycles')
  await deleteByUserId('training_programs')
  await deleteByUserId('training_maxes')

  const { error: deleteExercisesError } = await admin.from('exercises').delete().eq('created_by_user_id', userId)

  if (deleteExercisesError) {
    throw deleteExercisesError
  }
}

async function countRows(admin, table, column, value, filter) {
  let query = admin.from(table).select('*', { count: 'exact', head: true }).eq(column, value)

  if (filter?.kind === 'is') {
    query = query.is(filter.column, filter.value)
  }

  if (filter?.kind === 'not') {
    query = query.not(filter.column, filter.operator, filter.value)
  }

  const { count, error } = await query

  if (error) {
    throw error
  }

  return count ?? 0
}

export async function collectSeedStats(admin, userId) {
  const [
    totalTrainingMaxes,
    totalPrograms,
    totalCycles,
    totalWorkouts,
    totalSets,
    completedWorkoutCount,
    incompleteWorkoutCount,
  ] = await Promise.all([
    countRows(admin, 'training_maxes', 'user_id', userId),
    countRows(admin, 'training_programs', 'user_id', userId),
    countRows(admin, 'cycles', 'user_id', userId),
    countRows(admin, 'workouts', 'user_id', userId),
    countRows(admin, 'workout_sets', 'user_id', userId),
    countRows(admin, 'workouts', 'user_id', userId, { column: 'completed_at', kind: 'not', operator: 'is', value: null }),
    countRows(admin, 'workouts', 'user_id', userId, { column: 'completed_at', kind: 'is', value: null }),
  ])

  return {
    completedWorkoutCount,
    incompleteWorkoutCount,
    totalCycles,
    totalPrograms,
    totalSets,
    totalTrainingMaxes,
    totalWorkouts,
  }
}

export function assertSeedInvariants(actualStats, expectedSummary) {
  const expectedStats = {
    completedWorkoutCount: expectedSummary.completedWorkoutCount,
    incompleteWorkoutCount: expectedSummary.incompleteWorkoutCount,
    totalCycles: expectedSummary.totalCycles,
    totalPrograms: 1,
    totalSets: expectedSummary.totalSets,
    totalTrainingMaxes: expectedSummary.totalTrainingMaxes,
    totalWorkouts: expectedSummary.totalWorkouts,
  }
  const mismatches = Object.entries(expectedStats)
    .filter(([key, expectedValue]) => actualStats[key] !== expectedValue)
    .map(([key, expectedValue]) => `${key}: expected ${expectedValue}, received ${actualStats[key]}`)

  if (mismatches.length > 0) {
    throw new Error(`Seed invariant mismatch. ${mismatches.join('; ')}`)
  }
}

async function upsertProfile(admin, userId, plan, displayName = plan.profile.displayName) {
  const { error } = await admin.from('profiles').upsert({
    avatar_url: null,
    display_name: displayName,
    id: userId,
    preferred_unit: plan.profile.preferredUnit,
    strength_profile_age_years: plan.profile.strengthProfileAgeYears ?? null,
    strength_profile_bodyweight_lbs: plan.profile.strengthProfileBodyweightLbs ?? null,
    strength_profile_sex: plan.profile.strengthProfileSex ?? null,
    weight_rounding_lbs: plan.profile.weightRoundingLbs ?? null,
  })

  if (error) {
    throw error
  }
}

async function fetchExercises(admin) {
  const { data, error } = await admin.from('exercises').select('id, name').order('id')

  if (error) {
    throw error
  }

  return data
}

function mapExerciseId(exerciseIdMap, exerciseKey) {
  const exerciseId = exerciseIdMap.get(exerciseKey)

  if (!exerciseId) {
    throw new Error(`Missing exercise mapping for ${exerciseKey}.`)
  }

  return exerciseId
}

async function insertTrainingMaxes(admin, userId, exerciseIdMap, plan) {
  const rows = plan.trainingMaxes.map((trainingMax) => ({
    effective_date: trainingMax.effectiveDate,
    exercise_id: mapExerciseId(exerciseIdMap, trainingMax.exerciseKey),
    tm_percentage: trainingMax.tmPercentage,
    user_id: userId,
    weight_lbs: trainingMax.weightLbs,
  }))

  const { error } = await admin.from('training_maxes').insert(rows)

  if (error) {
    throw error
  }
}

async function insertProgram(admin, userId, plan) {
  const { data, error } = await admin
    .from('training_programs')
    .insert({
      config: plan.program.config,
      is_active: true,
      name: plan.program.name,
      start_date: plan.program.startDate,
      template_key: plan.program.templateKey,
      user_id: userId,
    })
    .select('id')
    .single()

  if (error) {
    throw error
  }

  return data.id
}

export function buildCycleInsertRow(cycle, userId, programId, plan) {
  return {
    auto_progression_applied: cycle.autoProgressionApplied,
    completed_at: cycle.completedAt,
    cycle_number: cycle.cycleNumber,
    config: plan.program.config,
    program_id: programId,
    start_date: cycle.startDate,
    template_key: plan.program.templateKey,
    user_id: userId,
  }
}

async function insertCyclesAndWorkouts(admin, userId, programId, exerciseIdMap, plan) {
  for (const cycle of plan.cycles) {
    const { data: cycleRow, error: cycleError } = await admin
      .from('cycles')
      .insert(buildCycleInsertRow(cycle, userId, programId, plan))
      .select('id')
      .single()

    if (cycleError) {
      throw cycleError
    }

    for (const workout of cycle.workouts) {
      const { data: workoutRow, error: workoutError } = await admin
        .from('workouts')
        .insert({
          completed_at: workout.completedAt,
          cycle_id: cycleRow.id,
          day_label: workout.dayLabel,
          notes: workout.notes,
          primary_exercise_id: mapExerciseId(exerciseIdMap, workout.dayKey),
          scheduled_date: workout.scheduledDate,
          started_at: workout.startedAt,
          user_id: userId,
          week_number: workout.weekNumber,
        })
        .select('id')
        .single()

      if (workoutError) {
        throw workoutError
      }

      const setRows = workout.sets.map((set) => ({
        exercise_id: mapExerciseId(exerciseIdMap, set.exerciseKey),
        intensity_type: set.intensityType,
        is_amrap: set.isAmrap,
        logged_at: set.loggedAt,
        reps_actual: set.repsActual,
        reps_prescribed: set.repsPrescribed,
        reps_prescribed_max: set.repsPrescribedMax,
        set_order: set.setOrder,
        set_type: set.setType,
        user_id: userId,
        weight_lbs: set.weightLbs,
        workout_id: workoutRow.id,
      }))

      const { error: setError } = await admin.from('workout_sets').insert(setRows)

      if (setError) {
        throw setError
      }
    }
  }
}

async function main() {
  loadLocalEnvFiles()

  const args = process.argv.slice(2)
  const verificationEmail = process.env.VERIFICATION_EMAIL ?? DEFAULT_VERIFICATION_EMAIL
  const admin = createAdminClient({ args, env: process.env, verificationEmail })
  const verificationPassword = getRequiredEnv('VERIFICATION_PASSWORD')
  const plan = buildSeedDataPlan(new Date())
  const extraSeedEmails = getAdditionalSeedEmails({ args, env: process.env, verificationEmail })
  const seedTargets = await resolveSeedTargets(admin, {
    extraEmails: extraSeedEmails,
    verificationEmail,
    verificationPassword,
  })

  console.log(`Seeding verification data for ${seedTargets.map((target) => target.email).join(', ')}...`)

  const exercises = await fetchExercises(admin)
  const exerciseIdMap = createExerciseIdMap(exercises)

  const summary = summarizeSeedDataPlan(plan)
  const seededUsers = []

  for (const target of seedTargets) {
    const userId = target.user.id

    await resetUserData(admin, userId)
    await upsertProfile(admin, userId, plan, target.displayName)
    await insertTrainingMaxes(admin, userId, exerciseIdMap, plan)
    const programId = await insertProgram(admin, userId, plan)
    await insertCyclesAndWorkouts(admin, userId, programId, exerciseIdMap, plan)

    const actualStats = await collectSeedStats(admin, userId)
    assertSeedInvariants(actualStats, summary)

    seededUsers.push({
      email: target.email,
      programId,
      ...actualStats,
      ...summary,
    })
  }

  console.log('Seed complete.')
  console.log(JSON.stringify({ seededUsers }, null, 2))
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error('Seed data run failed.')
    console.error(error)
    process.exitCode = 1
  })
}