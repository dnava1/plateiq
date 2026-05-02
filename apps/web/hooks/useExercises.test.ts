import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolveRepoPath } from '@/test/resolveRepoPath'
import { buildExerciseKeyMap, getExerciseLookupKeys, matchesExerciseSearch, resolveExerciseDisplayName, resolveExerciseFromList, resolveExerciseIdFromMap, resolveStrengthLiftSlug } from './useExercises'

const exerciseCatalog = [
  {
    id: 1,
    name: 'Overhead Press',
    category: 'main',
    analytics_track: 'standard',
    is_main_lift: true,
    movement_pattern: 'vertical_push',
    progression_increment_lbs: 5,
    strength_lift_slug: 'overhead_press',
    created_at: null,
    created_by_user_id: null,
  },
  {
    id: 2,
    name: 'Overhead Press',
    category: 'accessory',
    analytics_track: 'standard',
    is_main_lift: false,
    movement_pattern: 'vertical_push',
    progression_increment_lbs: null,
    strength_lift_slug: null,
    created_at: null,
    created_by_user_id: 'user-1',
  },
  {
    id: 3,
    name: 'Bench',
    category: 'accessory',
    analytics_track: 'standard',
    is_main_lift: false,
    movement_pattern: 'horizontal_push',
    progression_increment_lbs: null,
    strength_lift_slug: null,
    created_at: null,
    created_by_user_id: 'user-1',
  },
] as const

describe('useExercises helpers', () => {
  it('builds lookup aliases for supported exercise names', () => {
    expect(getExerciseLookupKeys('Bench Press')).toContain('bench_press')
    expect(getExerciseLookupKeys('Bench Press')).toContain('bench')
    expect(getExerciseLookupKeys('Overhead Press')).toContain('ohp')
  })

  it('maps recognized exercise names to strength profile lift slugs', () => {
    expect(resolveStrengthLiftSlug('Bench Press')).toBe('bench_press')
    expect(resolveStrengthLiftSlug('Bench')).toBe('bench_press')
    expect(resolveStrengthLiftSlug('OHP')).toBe('overhead_press')
    expect(resolveStrengthLiftSlug('Pull Up')).toBe('pull_up')
    expect(resolveStrengthLiftSlug('Chin Up')).toBe('chin_up')
    expect(resolveStrengthLiftSlug('Push Press')).toBe('push_press')
    expect(resolveStrengthLiftSlug('Barbell Row')).toBe('pendlay_row')
    expect(resolveStrengthLiftSlug('Custom Pullover')).toBeNull()
  })

  it('resolves shorthand keys to seeded exercises before matching custom duplicates', () => {
    const resolvedExercise = resolveExerciseFromList(exerciseCatalog as never, { exerciseKey: 'ohp' })

    expect(resolvedExercise?.id).toBe(1)
    expect(resolvedExercise?.created_by_user_id).toBeNull()
  })

  it('matches alias queries when filtering the exercise library', () => {
    expect(matchesExerciseSearch(exerciseCatalog[0] as never, 'ohp')).toBe(true)
    expect(matchesExerciseSearch(exerciseCatalog[0] as never, 'press')).toBe(true)
    expect(matchesExerciseSearch(exerciseCatalog[0] as never, 'deadlift')).toBe(false)
  })

  it('prefers an exact custom name match before falling back to seeded alias matches', () => {
    const resolvedExercise = resolveExerciseFromList(exerciseCatalog as never, { exerciseKey: 'Bench' })

    expect(resolvedExercise?.id).toBe(3)
    expect(resolvedExercise?.name).toBe('Bench')
  })

  it('treats duplicate exact-name matches without an id as ambiguous', () => {
    const resolvedExercise = resolveExerciseFromList(exerciseCatalog as never, { exerciseKey: 'Overhead Press' })

    expect(resolvedExercise).toBeUndefined()
  })

  it('treats stale explicit exercise ids as unresolved instead of falling back to a key match', () => {
    const resolvedExercise = resolveExerciseFromList(exerciseCatalog as never, { exerciseId: 999, exerciseKey: 'Overhead Press' })

    expect(resolvedExercise).toBeUndefined()
  })

  it('falls back to a formatted key when no exercise record can be resolved', () => {
    expect(resolveExerciseDisplayName(undefined, { exerciseKey: 'close_grip_bench' })).toBe('Close-Grip Bench Press')
  })

  it('preserves an exact exercise name when duplicate matches are ambiguous', () => {
    expect(resolveExerciseDisplayName(exerciseCatalog as never, { exerciseKey: 'Overhead Press' })).toBe('Overhead Press')
  })

  it('keeps exact duplicate names unresolved when resolving ids from the shared key map', () => {
    const exerciseKeyMap = buildExerciseKeyMap(exerciseCatalog as never)

    expect(resolveExerciseIdFromMap(exerciseKeyMap, 'Overhead Press')).toBeUndefined()
  })

  it('keeps exact-name matches ahead of alias lookups when resolving ids from the shared key map', () => {
    const exerciseKeyMap = buildExerciseKeyMap(exerciseCatalog as never)

    expect(resolveExerciseIdFromMap(exerciseKeyMap, 'Bench')).toBe(3)
    expect(resolveExerciseIdFromMap(exerciseKeyMap, 'ohp')).toBe(1)
  })

  it('keeps the server-side alias backfill aligned with the runtime resolver', () => {
    const migrationSql = readFileSync(resolveRepoPath('supabase/migrations/20260413125500_strength_lift_alias_backfill.sql'), 'utf8')

    expect(migrationSql).toContain("WHEN 'bench', 'bench_press' THEN")
    expect(migrationSql).toContain("WHEN 'ohp', 'overhead_press' THEN")
    expect(migrationSql).toContain("WHEN 'pull_up' THEN")
    expect(migrationSql).toContain("WHEN 'chin_up' THEN")
  })
})