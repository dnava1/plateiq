import { del, get, keys, set } from 'idb-keyval'
import type { SetSyncState, RestTimerState } from '@/store/workoutSessionStore'
import type { TrainingProgram } from '@/hooks/usePrograms'
import type { WorkoutDisplaySet } from '@/components/workouts/types'

const SNAPSHOT_VERSION = 1
const SNAPSHOT_KEY_PREFIX = 'plateiq-offline-workout-snapshot:v1'
const OUTBOX_KEY_PREFIX = 'plateiq-offline-workout-outbox:v1'
const LAST_SNAPSHOT_USER_KEY = 'plateiq-offline-workout:last-user'

export type OfflineWorkoutOutboxKind = 'set-log' | 'workout-complete' | 'prescription-update'
export type OfflineWorkoutOutboxStatus = 'queued' | 'syncing' | 'failed'

export interface OfflineWorkoutOutboxEntry {
  createdAt: string
  id: string
  kind: OfflineWorkoutOutboxKind
  lastError: string | null
  retryCount: number
  setOrder: number | null
  status: OfflineWorkoutOutboxStatus
  updatedAt: string
  variables: unknown
  workoutId: number
}

export interface OfflineWorkoutSnapshot {
  activeDayIndex: number
  activeWeekNumber: number
  completedAt: string | null
  cycleId: number
  cycleNumber: number | null
  dayLabel: string
  lastFailureReason: string | null
  lastSuccessfulSyncAt: string | null
  pendingCompletionWorkoutId: number | null
  pendingMutationCount: number
  program: Pick<TrainingProgram, 'config' | 'id' | 'name' | 'template_key'>
  restTimer: RestTimerState
  savedAt: string
  sets: WorkoutDisplaySet[]
  syncStates: Record<number, SetSyncState>
  userId: string
  version: typeof SNAPSHOT_VERSION
  workoutId: number
}

export function getActiveWorkoutSnapshotKey(userId: string) {
  return `${SNAPSHOT_KEY_PREFIX}:${userId}`
}

export function getOfflineWorkoutOutboxKey(userId: string, entryId: string) {
  return `${OUTBOX_KEY_PREFIX}:${userId}:${entryId}`
}

export function getOfflineWorkoutOutboxEntryId(
  kind: OfflineWorkoutOutboxKind,
  workoutId: number,
  setOrder?: number | null,
) {
  return setOrder === null || setOrder === undefined
    ? `${kind}:${workoutId}`
    : `${kind}:${workoutId}:${setOrder}`
}

function rememberLastSnapshotUser(userId: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(LAST_SNAPSHOT_USER_KEY, userId)
}

export function getLastSnapshotUserId() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(LAST_SNAPSHOT_USER_KEY)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeOfflineWorkoutSnapshot(value: unknown): OfflineWorkoutSnapshot | null {
  if (!isObject(value) || value.version !== SNAPSHOT_VERSION) {
    return null
  }

  if (
    typeof value.userId !== 'string'
    || typeof value.workoutId !== 'number'
    || typeof value.cycleId !== 'number'
    || typeof value.activeDayIndex !== 'number'
    || typeof value.activeWeekNumber !== 'number'
    || typeof value.dayLabel !== 'string'
    || !Array.isArray(value.sets)
    || !isObject(value.program)
    || !isObject(value.restTimer)
  ) {
    return null
  }

  return value as unknown as OfflineWorkoutSnapshot
}

export async function saveActiveWorkoutSnapshot(snapshot: OfflineWorkoutSnapshot) {
  rememberLastSnapshotUser(snapshot.userId)
  await set(getActiveWorkoutSnapshotKey(snapshot.userId), snapshot)
}

export async function getActiveWorkoutSnapshot(userId: string) {
  return normalizeOfflineWorkoutSnapshot(await get(getActiveWorkoutSnapshotKey(userId)))
}

export async function getLastActiveWorkoutSnapshot() {
  const userId = getLastSnapshotUserId()

  if (!userId) {
    return null
  }

  return getActiveWorkoutSnapshot(userId)
}

export async function clearActiveWorkoutSnapshot(userId: string) {
  await del(getActiveWorkoutSnapshotKey(userId))

  if (typeof window !== 'undefined' && getLastSnapshotUserId() === userId) {
    window.localStorage.removeItem(LAST_SNAPSHOT_USER_KEY)
  }
}

async function patchActiveWorkoutSnapshot(
  userId: string,
  patch: Pick<OfflineWorkoutSnapshot, 'lastFailureReason' | 'lastSuccessfulSyncAt'>,
) {
  const snapshot = await getActiveWorkoutSnapshot(userId)

  if (!snapshot) {
    return
  }

  await set(getActiveWorkoutSnapshotKey(userId), {
    ...snapshot,
    ...patch,
    savedAt: new Date().toISOString(),
  } satisfies OfflineWorkoutSnapshot)
}

export function createOfflineWorkoutOutboxEntry(input: {
  kind: OfflineWorkoutOutboxKind
  setOrder?: number | null
  variables: unknown
  workoutId: number
}): OfflineWorkoutOutboxEntry {
  const now = new Date().toISOString()

  return {
    createdAt: now,
    id: getOfflineWorkoutOutboxEntryId(input.kind, input.workoutId, input.setOrder ?? null),
    kind: input.kind,
    lastError: null,
    retryCount: 0,
    setOrder: input.setOrder ?? null,
    status: 'queued',
    updatedAt: now,
    variables: input.variables,
    workoutId: input.workoutId,
  }
}

function normalizeOfflineWorkoutOutboxEntry(value: unknown): OfflineWorkoutOutboxEntry | null {
  if (!isObject(value)) {
    return null
  }

  if (
    typeof value.id !== 'string'
    || typeof value.kind !== 'string'
    || typeof value.workoutId !== 'number'
    || typeof value.createdAt !== 'string'
    || typeof value.updatedAt !== 'string'
  ) {
    return null
  }

  return value as unknown as OfflineWorkoutOutboxEntry
}

export async function upsertOfflineWorkoutOutboxEntry(userId: string, entry: OfflineWorkoutOutboxEntry) {
  const existing = normalizeOfflineWorkoutOutboxEntry(
    await get(getOfflineWorkoutOutboxKey(userId, entry.id)),
  )

  await set(getOfflineWorkoutOutboxKey(userId, entry.id), {
    ...entry,
    createdAt: existing?.createdAt ?? entry.createdAt,
    retryCount: existing?.retryCount ?? entry.retryCount,
  } satisfies OfflineWorkoutOutboxEntry)
}

export async function markOfflineWorkoutOutboxEntrySyncing(userId: string, entryId: string) {
  const key = getOfflineWorkoutOutboxKey(userId, entryId)
  const existing = normalizeOfflineWorkoutOutboxEntry(await get(key))

  if (!existing) {
    return
  }

  await set(key, {
    ...existing,
    status: 'syncing',
    updatedAt: new Date().toISOString(),
  } satisfies OfflineWorkoutOutboxEntry)
}

export async function markOfflineWorkoutOutboxEntryFailed(userId: string, entryId: string, error: unknown) {
  const key = getOfflineWorkoutOutboxKey(userId, entryId)
  const existing = normalizeOfflineWorkoutOutboxEntry(await get(key))
  const message = error instanceof Error ? error.message : 'Sync failed.'

  if (!existing) {
    await patchActiveWorkoutSnapshot(userId, {
      lastFailureReason: message,
      lastSuccessfulSyncAt: null,
    })
    return
  }

  await set(key, {
    ...existing,
    lastError: message,
    retryCount: existing.retryCount + 1,
    status: 'failed',
    updatedAt: new Date().toISOString(),
  } satisfies OfflineWorkoutOutboxEntry)
  await patchActiveWorkoutSnapshot(userId, {
    lastFailureReason: message,
    lastSuccessfulSyncAt: null,
  })
}

export async function markOfflineWorkoutOutboxEntrySynced(userId: string, entryId: string) {
  await del(getOfflineWorkoutOutboxKey(userId, entryId))
  await patchActiveWorkoutSnapshot(userId, {
    lastFailureReason: null,
    lastSuccessfulSyncAt: new Date().toISOString(),
  })
}

export async function getOfflineWorkoutOutboxEntries(userId: string) {
  const storedKeys = await keys()
  const prefix = `${OUTBOX_KEY_PREFIX}:${userId}:`
  const entryKeys = storedKeys
    .map((key) => String(key))
    .filter((key) => key.startsWith(prefix))

  const entries = await Promise.all(entryKeys.map(async (key) => normalizeOfflineWorkoutOutboxEntry(await get(key))))

  return entries
    .filter((entry): entry is OfflineWorkoutOutboxEntry => Boolean(entry))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}
