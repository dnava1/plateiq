// @vitest-environment node

import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import {
  ACCOUNT_EXPORT_MANIFEST_PATH,
  ACCOUNT_EXPORT_SERVER_DATA_PATH,
  ACCOUNT_EXPORT_SERVER_SCHEMA_VERSION,
  buildAccountExportArchive,
  buildAccountExportRateLimitHeaders,
  parseAccountExportFilename,
  type AccountExportServerPayload,
} from '@/lib/export/account-export'
import {
  accountExportArchiveSchema,
  accountExportManifestSchema,
} from '@/lib/validations/account-export'

const samplePayload: AccountExportServerPayload = {
  schemaVersion: ACCOUNT_EXPORT_SERVER_SCHEMA_VERSION,
  snapshotAt: '2026-05-12T14:30:00.000Z',
  ownerUserId: '550e8400-e29b-41d4-a716-446655440000',
  training_programs: [
    {
      config: null,
      created_at: '2026-05-01T12:00:00.000Z',
      id: 7,
      is_active: true,
      name: '5/3/1 BBB',
      start_date: '2026-05-01',
      template_key: 'wendler-531-bbb',
      updated_at: '2026-05-02T12:00:00.000Z',
    },
  ],
  cycles: [
    {
      auto_progression_applied: false,
      completed_at: null,
      config: null,
      created_at: '2026-05-01T12:00:00.000Z',
      cycle_number: 1,
      id: 11,
      program_id: 7,
      start_date: '2026-05-01',
      template_key: 'wendler-531-bbb',
    },
  ],
  workouts: [
    {
      completed_at: '2026-05-03T12:15:00.000Z',
      created_at: '2026-05-03T12:00:00.000Z',
      cycle_id: 11,
      day_label: 'Bench Day',
      id: 19,
      notes: 'Felt strong today.',
      primary_exercise_id: 3,
      scheduled_date: '2026-05-03',
      started_at: '2026-05-03T12:00:00.000Z',
      week_number: 1,
    },
  ],
  workout_sets: [
    {
      exercise_id: 3,
      id: 27,
      intensity_type: 'percentage',
      is_amrap: false,
      logged_at: '2026-05-03T12:05:00.000Z',
      prescribed_intensity: 0.75,
      prescribed_weight_lbs: 170,
      prescription_base_weight_lbs: 225,
      reps_actual: 5,
      reps_prescribed: 5,
      reps_prescribed_max: null,
      rpe: 8,
      set_order: 1,
      set_type: 'work',
      updated_at: '2026-05-03T12:05:00.000Z',
      weight_lbs: 170,
      workout_id: 19,
    },
  ],
  exercises: [
    {
      analytics_track: 'bench_press',
      created_at: '2026-04-01T00:00:00.000Z',
      id: 3,
      is_custom: false,
      movement_pattern: 'push',
      name: 'Bench Press',
      progression_increment_lbs: 5,
      strength_lift_slug: 'bench',
    },
  ],
}

describe('account export helpers', () => {
  it('builds a manifest and zip archive that match the shared schemas', () => {
    const archive = buildAccountExportArchive(samplePayload)
    const zipEntries = unzipSync(archive.zipBytes)

    expect(archive.filename).toBe('plateiq-export-20260512T143000Z.zip')
    expect(Object.keys(zipEntries).sort()).toEqual([
      ACCOUNT_EXPORT_MANIFEST_PATH,
      ACCOUNT_EXPORT_SERVER_DATA_PATH,
    ])

    const manifest = accountExportManifestSchema.parse(JSON.parse(strFromU8(zipEntries[ACCOUNT_EXPORT_MANIFEST_PATH])))
    const serverPayload = accountExportArchiveSchema.parse(JSON.parse(strFromU8(zipEntries[ACCOUNT_EXPORT_SERVER_DATA_PATH])))

    expect(manifest.archiveBaseName).toBe('plateiq-export-20260512T143000Z')
    expect(manifest.recordCounts).toEqual({
      training_programs: 1,
      cycles: 1,
      workouts: 1,
      workout_sets: 1,
      exercises: 1,
    })
    expect(manifest.files.map((file) => file.path).sort()).toEqual([
      ACCOUNT_EXPORT_MANIFEST_PATH,
      ACCOUNT_EXPORT_SERVER_DATA_PATH,
    ])
    expect(serverPayload).toEqual(samplePayload)
  })

  it('parses content-disposition filenames and falls back to the timestamped default', () => {
    expect(parseAccountExportFilename(
      'attachment; filename="plateiq-export-20260512T143000Z.zip"',
    )).toBe('plateiq-export-20260512T143000Z.zip')

    expect(parseAccountExportFilename(
      null,
      '2026-05-12T14:30:00.000Z',
    )).toBe('plateiq-export-20260512T143000Z.zip')
  })

  it('includes retry metadata when the quota is exhausted', () => {
    const headers = buildAccountExportRateLimitHeaders({
      allowed: false,
      limit: 5,
      used: 5,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000).toISOString(),
    })

    expect(headers['X-RateLimit-Limit']).toBe('5')
    expect(headers['X-RateLimit-Remaining']).toBe('0')
    expect(headers['Retry-After']).toBeDefined()
  })
})