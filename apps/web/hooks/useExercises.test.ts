import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolveRepoPath } from '@/test/resolveRepoPath'
import { getExerciseLookupKeys, resolveStrengthLiftSlug } from './useExercises'

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

  it('keeps the server-side alias backfill aligned with the runtime resolver', () => {
    const migrationSql = readFileSync(resolveRepoPath('supabase/migrations/20260413125500_strength_lift_alias_backfill.sql'), 'utf8')

    expect(migrationSql).toContain("WHEN 'bench', 'bench_press' THEN")
    expect(migrationSql).toContain("WHEN 'ohp', 'overhead_press' THEN")
    expect(migrationSql).toContain("WHEN 'pull_up' THEN")
    expect(migrationSql).toContain("WHEN 'chin_up' THEN")
  })
})