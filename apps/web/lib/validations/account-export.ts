import { z } from 'zod'
import {
  ACCOUNT_EXPORT_ARCHIVE_SCHEMA_VERSION,
  ACCOUNT_EXPORT_EXCLUDED_DOMAINS,
  ACCOUNT_EXPORT_FORMAT,
  ACCOUNT_EXPORT_INCLUDED_TABLES,
  ACCOUNT_EXPORT_MANIFEST_PATH,
  ACCOUNT_EXPORT_SERVER_DATA_PATH,
  ACCOUNT_EXPORT_SERVER_SCHEMA_VERSION,
  type AccountExportManifest,
  type AccountExportServerPayload,
} from '@/lib/export/account-export'
import type { Json } from '@/types/database'

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Expected a YYYY-MM-DD date string.',
})

const isoTimestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Expected an ISO-8601 timestamp.',
})

const jsonValueSchema: z.ZodType<Json> = z.lazy(() => z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(jsonValueSchema),
  z.record(z.string(), jsonValueSchema),
]))

export const accountExportRequestSchema = z.object({
  format: z.literal(ACCOUNT_EXPORT_FORMAT),
}).strict()

const trainingProgramSchema = z.object({
  id: z.number().int().nonnegative(),
  name: z.string(),
  template_key: z.string(),
  start_date: isoDateSchema,
  is_active: z.boolean(),
  config: jsonValueSchema.nullable(),
  created_at: isoTimestampSchema.nullable(),
  updated_at: isoTimestampSchema.nullable(),
}).strict()

const cycleSchema = z.object({
  id: z.number().int().nonnegative(),
  program_id: z.number().int().nonnegative(),
  cycle_number: z.number().int().nonnegative(),
  template_key: z.string(),
  start_date: isoDateSchema,
  completed_at: isoTimestampSchema.nullable(),
  auto_progression_applied: z.boolean(),
  config: jsonValueSchema.nullable(),
  created_at: isoTimestampSchema.nullable(),
}).strict()

const workoutSchema = z.object({
  id: z.number().int().nonnegative(),
  cycle_id: z.number().int().nonnegative(),
  primary_exercise_id: z.number().int().nonnegative(),
  week_number: z.number().int().nonnegative(),
  day_label: z.string().nullable(),
  scheduled_date: isoDateSchema,
  started_at: isoTimestampSchema.nullable(),
  completed_at: isoTimestampSchema.nullable(),
  notes: z.string().nullable(),
  created_at: isoTimestampSchema.nullable(),
}).strict()

const workoutSetSchema = z.object({
  id: z.number().int().nonnegative(),
  workout_id: z.number().int().nonnegative(),
  exercise_id: z.number().int().nonnegative(),
  set_order: z.number().int().nonnegative(),
  set_type: z.string(),
  weight_lbs: z.number(),
  reps_prescribed: z.number().int().nonnegative(),
  reps_prescribed_max: z.number().int().nonnegative().nullable(),
  reps_actual: z.number().int().nonnegative().nullable(),
  is_amrap: z.boolean(),
  rpe: z.number().nullable(),
  intensity_type: z.string(),
  prescribed_weight_lbs: z.number().nullable(),
  prescribed_intensity: z.number().nullable(),
  prescription_base_weight_lbs: z.number().nullable(),
  logged_at: isoTimestampSchema.nullable(),
  updated_at: isoTimestampSchema.nullable(),
}).strict()

const exerciseSchema = z.object({
  id: z.number().int().nonnegative(),
  name: z.string(),
  movement_pattern: z.string(),
  progression_increment_lbs: z.number().nullable(),
  analytics_track: z.string(),
  strength_lift_slug: z.string().nullable(),
  created_at: isoTimestampSchema.nullable(),
  is_custom: z.boolean(),
}).strict()

export const accountExportArchiveSchema: z.ZodType<AccountExportServerPayload> = z.object({
  schemaVersion: z.literal(ACCOUNT_EXPORT_SERVER_SCHEMA_VERSION),
  snapshotAt: isoTimestampSchema,
  ownerUserId: z.string().uuid(),
  training_programs: z.array(trainingProgramSchema),
  cycles: z.array(cycleSchema),
  workouts: z.array(workoutSchema),
  workout_sets: z.array(workoutSetSchema),
  exercises: z.array(exerciseSchema),
}).strict()

export const accountExportManifestSchema: z.ZodType<AccountExportManifest> = z.object({
  archiveSchemaVersion: z.literal(ACCOUNT_EXPORT_ARCHIVE_SCHEMA_VERSION),
  generatedAt: isoTimestampSchema,
  archiveBaseName: z.string().min(1),
  serverPayloadSchemaVersion: z.literal(ACCOUNT_EXPORT_SERVER_SCHEMA_VERSION),
  ownerUserId: z.string().uuid(),
  scope: z.object({
    includedTables: z.array(z.enum(ACCOUNT_EXPORT_INCLUDED_TABLES)),
    excludedDomains: z.array(z.enum(ACCOUNT_EXPORT_EXCLUDED_DOMAINS)),
  }).strict(),
  recordCounts: z.object({
    training_programs: z.number().int().nonnegative(),
    cycles: z.number().int().nonnegative(),
    workouts: z.number().int().nonnegative(),
    workout_sets: z.number().int().nonnegative(),
    exercises: z.number().int().nonnegative(),
  }).strict(),
  files: z.array(z.object({
    path: z.enum([ACCOUNT_EXPORT_MANIFEST_PATH, ACCOUNT_EXPORT_SERVER_DATA_PATH]),
    contentType: z.literal('application/json'),
    sizeBytes: z.number().int().nonnegative(),
  }).strict()),
  warnings: z.array(z.string()),
}).strict()

export type AccountExportRequest = z.infer<typeof accountExportRequestSchema>
export type AccountExportArchivePayload = z.infer<typeof accountExportArchiveSchema>
export type AccountExportManifestPayload = z.infer<typeof accountExportManifestSchema>