import { zipSync } from 'fflate'
import type { Tables } from '@/types/database'

export const ACCOUNT_EXPORT_ROUTE = '/api/export/account'
export const ACCOUNT_EXPORT_FORMAT = 'zip-json-v1'
export const ACCOUNT_EXPORT_ARCHIVE_SCHEMA_VERSION = 'plateiq-archive-v1'
export const ACCOUNT_EXPORT_SERVER_SCHEMA_VERSION = 'plateiq-training-graph-v1'
export const ACCOUNT_EXPORT_MANIFEST_PATH = 'manifest.json'
export const ACCOUNT_EXPORT_SERVER_DATA_PATH = 'server/account-data.json'
export const ACCOUNT_EXPORT_CONTENT_TYPE = 'application/zip'
export const ACCOUNT_EXPORT_FILE_NAME_PREFIX = 'plateiq-export'
export const ACCOUNT_EXPORT_HOURLY_LIMIT = 5
export const ACCOUNT_EXPORT_SERIALIZED_MAX_BYTES = 8 * 1024 * 1024
export const ACCOUNT_EXPORT_ERROR_MESSAGE = 'Unable to prepare your export right now.'
export const ACCOUNT_EXPORT_GUEST_ERROR_MESSAGE = 'Export is unavailable for guest sessions.'
export const ACCOUNT_EXPORT_TOO_LARGE_ERROR_MESSAGE = 'This account is too large for the current in-app export flow.'
export const ACCOUNT_EXPORT_TOO_LARGE_CODE = 'export_too_large_for_in_app_download'
export const ACCOUNT_EXPORT_INCLUDED_TABLES = [
  'training_programs',
  'cycles',
  'workouts',
  'workout_sets',
  'exercises',
] as const
export const ACCOUNT_EXPORT_EXCLUDED_DOMAINS = [
  'profiles',
  'training_maxes',
  'feedback_submissions',
  'device-local data',
  'training preferences',
] as const

export type AccountExportTrainingProgram = Omit<Tables<'training_programs'>, 'user_id'>
export type AccountExportCycle = Omit<Tables<'cycles'>, 'user_id'>
export type AccountExportWorkout = Omit<Tables<'workouts'>, 'user_id'>
export type AccountExportWorkoutSet = Omit<Tables<'workout_sets'>, 'user_id'>
export type AccountExportExercise = Omit<Tables<'exercises'>, 'created_by_user_id'> & {
  is_custom: boolean
}

export type AccountExportServerPayload = {
  schemaVersion: typeof ACCOUNT_EXPORT_SERVER_SCHEMA_VERSION
  snapshotAt: string
  ownerUserId: string
  training_programs: AccountExportTrainingProgram[]
  cycles: AccountExportCycle[]
  workouts: AccountExportWorkout[]
  workout_sets: AccountExportWorkoutSet[]
  exercises: AccountExportExercise[]
}

export type AccountExportRecordCounts = {
  training_programs: number
  cycles: number
  workouts: number
  workout_sets: number
  exercises: number
}

export type AccountExportManifestFile = {
  path: string
  contentType: 'application/json'
  sizeBytes: number
}

export type AccountExportManifest = {
  archiveSchemaVersion: typeof ACCOUNT_EXPORT_ARCHIVE_SCHEMA_VERSION
  generatedAt: string
  archiveBaseName: string
  serverPayloadSchemaVersion: typeof ACCOUNT_EXPORT_SERVER_SCHEMA_VERSION
  ownerUserId: string
  scope: {
    includedTables: Array<(typeof ACCOUNT_EXPORT_INCLUDED_TABLES)[number]>
    excludedDomains: Array<(typeof ACCOUNT_EXPORT_EXCLUDED_DOMAINS)[number]>
  }
  recordCounts: AccountExportRecordCounts
  files: AccountExportManifestFile[]
  warnings: string[]
}

export type AccountExportArchive = {
  archiveBaseName: string
  filename: string
  manifest: AccountExportManifest
  manifestJson: string
  serverPayloadJson: string
  zipBytes: Uint8Array
}

export type AccountExportQuota = {
  allowed: boolean
  limit: number
  used: number
  remaining: number
  resetAt: string
}

export function serializeAccountExportServerPayload(payload: AccountExportServerPayload) {
  return JSON.stringify(payload)
}

export function getUtf8ByteLength(value: string) {
  return new TextEncoder().encode(value).byteLength
}

export function buildAccountExportZip(entries: Record<string, string>) {
  const zipEntries = Object.entries(entries).reduce<Record<string, [Uint8Array, { level: 6 }]>>(
    (result, [path, contents]) => {
      result[path] = [Uint8Array.from(new TextEncoder().encode(contents)), { level: 6 }]
      return result
    },
    {},
  )

  return zipSync(zipEntries)
}

export function getAccountExportRecordCounts(payload: AccountExportServerPayload): AccountExportRecordCounts {
  return {
    training_programs: payload.training_programs.length,
    cycles: payload.cycles.length,
    workouts: payload.workouts.length,
    workout_sets: payload.workout_sets.length,
    exercises: payload.exercises.length,
  }
}

function formatTimestampForFilename(timestamp: string) {
  const parsedTimestamp = new Date(timestamp)

  if (Number.isNaN(parsedTimestamp.valueOf())) {
    return 'unknown'
  }

  return parsedTimestamp
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

export function buildAccountExportBaseName(snapshotAt: string) {
  return `${ACCOUNT_EXPORT_FILE_NAME_PREFIX}-${formatTimestampForFilename(snapshotAt)}`
}

export function buildAccountExportFilename(snapshotAt: string) {
  return `${buildAccountExportBaseName(snapshotAt)}.zip`
}

function createManifest(
  payload: AccountExportServerPayload,
  archiveBaseName: string,
  serverPayloadSizeBytes: number,
  manifestSizeBytes: number,
): AccountExportManifest {
  return {
    archiveSchemaVersion: ACCOUNT_EXPORT_ARCHIVE_SCHEMA_VERSION,
    generatedAt: payload.snapshotAt,
    archiveBaseName,
    serverPayloadSchemaVersion: ACCOUNT_EXPORT_SERVER_SCHEMA_VERSION,
    ownerUserId: payload.ownerUserId,
    scope: {
      includedTables: [...ACCOUNT_EXPORT_INCLUDED_TABLES],
      excludedDomains: [...ACCOUNT_EXPORT_EXCLUDED_DOMAINS],
    },
    recordCounts: getAccountExportRecordCounts(payload),
    files: [
      {
        path: ACCOUNT_EXPORT_MANIFEST_PATH,
        contentType: 'application/json',
        sizeBytes: manifestSizeBytes,
      },
      {
        path: ACCOUNT_EXPORT_SERVER_DATA_PATH,
        contentType: 'application/json',
        sizeBytes: serverPayloadSizeBytes,
      },
    ],
    warnings: [],
  }
}

export function serializeAccountExportManifest(manifest: AccountExportManifest) {
  return JSON.stringify(manifest)
}

export function buildAccountExportManifest(
  payload: AccountExportServerPayload,
  archiveBaseName: string,
  serverPayloadJson: string,
) {
  const serverPayloadSizeBytes = getUtf8ByteLength(serverPayloadJson)
  let manifestSizeBytes = 0
  let manifest = createManifest(payload, archiveBaseName, serverPayloadSizeBytes, manifestSizeBytes)
  let manifestJson = serializeAccountExportManifest(manifest)

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const nextManifestSizeBytes = getUtf8ByteLength(manifestJson)

    if (nextManifestSizeBytes === manifestSizeBytes) {
      break
    }

    manifestSizeBytes = nextManifestSizeBytes
    manifest = createManifest(payload, archiveBaseName, serverPayloadSizeBytes, manifestSizeBytes)
    manifestJson = serializeAccountExportManifest(manifest)
  }

  return {
    manifest,
    manifestJson,
  }
}

export function buildAccountExportArchive(payload: AccountExportServerPayload): AccountExportArchive {
  const archiveBaseName = buildAccountExportBaseName(payload.snapshotAt)
  const filename = `${archiveBaseName}.zip`
  const serverPayloadJson = serializeAccountExportServerPayload(payload)
  const { manifest, manifestJson } = buildAccountExportManifest(payload, archiveBaseName, serverPayloadJson)
  const zipBytes = buildAccountExportZip({
    [ACCOUNT_EXPORT_MANIFEST_PATH]: manifestJson,
    [ACCOUNT_EXPORT_SERVER_DATA_PATH]: serverPayloadJson,
  })

  return {
    archiveBaseName,
    filename,
    manifest,
    manifestJson,
    serverPayloadJson,
    zipBytes,
  }
}

export function parseAccountExportQuota(data: unknown): AccountExportQuota | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const allowed = 'allowed' in data ? data.allowed : undefined
  const limit = 'limit' in data ? data.limit : undefined
  const used = 'used' in data ? data.used : undefined
  const remaining = 'remaining' in data ? data.remaining : undefined
  const resetAt = 'reset_at' in data ? data.reset_at : undefined

  if (
    typeof allowed !== 'boolean'
    || typeof limit !== 'number'
    || typeof used !== 'number'
    || typeof remaining !== 'number'
    || typeof resetAt !== 'string'
    || Number.isNaN(Date.parse(resetAt))
  ) {
    return null
  }

  return {
    allowed,
    limit,
    used,
    remaining,
    resetAt,
  }
}

export function buildAccountExportRateLimitHeaders(quota: AccountExportQuota) {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(quota.limit),
    'X-RateLimit-Remaining': String(quota.remaining),
    'X-RateLimit-Reset': quota.resetAt,
  }

  if (!quota.allowed) {
    const retryAfterSeconds = Math.max(
      Math.ceil((Date.parse(quota.resetAt) - Date.now()) / 1000),
      0,
    )
    headers['Retry-After'] = String(retryAfterSeconds)
  }

  return headers
}

function decodeFilenamePart(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function parseAccountExportFilename(
  contentDisposition: string | null,
  fallbackSnapshotAt = new Date().toISOString(),
) {
  if (!contentDisposition) {
    return buildAccountExportFilename(fallbackSnapshotAt)
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)

  if (utf8Match?.[1]) {
    return decodeFilenamePart(utf8Match[1].trim())
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i)

  if (plainMatch?.[1]) {
    return plainMatch[1].trim()
  }

  return buildAccountExportFilename(fallbackSnapshotAt)
}