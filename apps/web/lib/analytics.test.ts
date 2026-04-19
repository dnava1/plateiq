import { describe, expect, it } from 'vitest'
import { createEmptyStrengthProfile } from './strength-profile'
import {
  aggregateWeeklyVolume,
  buildWeeklyActivity,
  deriveRecentPrs,
  parseAnalyticsData,
  parseDashboardData,
} from './analytics'

describe('parseDashboardData', () => {
  it('maps dashboard payloads and drops malformed rows', () => {
    const result = parseDashboardData({
      active_program: { id: 2, name: '5/3/1', template_key: 'wendler_531' },
      current_cycle: { id: 7, cycle_number: 3 },
      recent_workouts: [
        {
          id: 11,
          exercise_name: 'Bench Press',
          week_number: 2,
          completed_at: '2026-04-10T10:00:00Z',
          scheduled_date: '2026-04-10',
        },
        { id: 'bad-row' },
      ],
      current_tms: [
        {
          exercise_id: 5,
          exercise_name: 'Bench Press',
          weight_lbs: 210,
          effective_date: '2026-04-08',
        },
      ],
    })

    expect(result).toEqual({
      activeProgram: { id: 2, name: '5/3/1', templateKey: 'wendler_531' },
      currentCycle: { id: 7, cycleNumber: 3 },
      recentWorkouts: [
        {
          id: 11,
          exerciseName: 'Bench Press',
          weekNumber: 2,
          completedAt: '2026-04-10T10:00:00Z',
          scheduledDate: '2026-04-10',
        },
      ],
      currentTms: [
        {
          exerciseId: 5,
          exerciseName: 'Bench Press',
          weightLbs: 210,
          effectiveDate: '2026-04-08',
        },
      ],
    })
  })
})

describe('parseAnalyticsData', () => {
  it('normalizes analytics payloads and falls back to empty consistency defaults', () => {
    const result = parseAnalyticsData({
      e1rm_trend: [
        {
          date: '2026-04-01',
          exercise_id: 1,
          exercise_name: 'Squat',
          weight: 275,
          reps: 6,
          e1rm: 330,
        },
      ],
      volume_trend: [
        {
          week_start: '2026-03-30',
          exercise_id: 1,
          exercise_name: 'Squat',
          total_volume: 8250,
          total_sets: 5,
        },
      ],
      pr_history: [],
      muscle_balance: [
        { movement_pattern: 'squat', total_volume: 8250, volume_pct: 48 },
      ],
      stall_detection: [
        { exercise_id: 1, exercise_name: 'Squat', last_pr_date: '2026-03-18', weeks_since_pr: 3 },
      ],
      tm_progression: [
        {
          effective_date: '2026-03-01',
          exercise_id: 1,
          exercise_name: 'Squat',
          weight_lbs: 315,
        },
      ],
      coverage: {
        metrics: {
          bodyweight_lane: { family: 'bodyweight_specific', status: 'ready', signal_count: 2, reason_codes: [] },
          consistency: { family: 'general_logging', status: 'ready', signal_count: 3, reason_codes: [] },
          e1rm_trend: { family: 'main_lift_amrap', status: 'limited', signal_count: 1, reason_codes: ['limited_history'] },
          muscle_balance: { family: 'general_logging', status: 'ready', signal_count: 2, reason_codes: [] },
          pr_history: { family: 'main_lift_amrap', status: 'limited', signal_count: 1, reason_codes: ['limited_history'] },
          stall_detection: { family: 'main_lift_amrap', status: 'limited', signal_count: 1, reason_codes: ['limited_history'] },
          strength_profile: { family: 'benchmark_profile', status: 'limited', signal_count: 0, reason_codes: ['strength_profile_missing_profile'] },
          tm_progression: { family: 'training_max', status: 'limited', signal_count: 1, reason_codes: ['limited_history'] },
          volume_trend: { family: 'general_logging', status: 'ready', signal_count: 4, reason_codes: [] },
        },
      },
      bodyweight_lane: {
        relevant: true,
        exercise_summaries: [
          {
            exercise_id: 7,
            exercise_name: 'Pull-Up',
            strict_session_count: 2,
            weighted_session_count: 1,
            latest_strict_rep_best: 12,
            latest_added_load_lbs: 25,
            last_session_date: '2026-04-02',
          },
        ],
        strict_rep_trend: [
          {
            date: '2026-04-02',
            exercise_id: 7,
            exercise_name: 'Pull-Up',
            best_reps: 12,
          },
        ],
        weighted_load_trend: [
          {
            date: '2026-04-03',
            exercise_id: 7,
            exercise_name: 'Pull-Up',
            added_weight_lbs: 25,
            reps: 6,
          },
        ],
      },
    })

    expect(result.consistency).toEqual({
      totalSessions: 0,
      weeksActive: 0,
      firstSession: null,
      lastSession: null,
    })
    expect(result.e1rmTrend).toHaveLength(1)
    expect(result.volumeTrend).toHaveLength(1)
    expect(result.muscleBalance).toEqual([
      { movementPattern: 'squat', totalVolume: 8250, volumePct: 48 },
    ])
    expect(result.stallDetection).toEqual([
      { exerciseId: 1, exerciseName: 'Squat', lastPrDate: '2026-03-18', weeksSincePr: 3 },
    ])
    expect(result.tmProgression).toEqual([
      { effectiveDate: '2026-03-01', exerciseId: 1, exerciseName: 'Squat', weightLbs: 315 },
    ])
    expect(result.strengthProfile).toEqual(createEmptyStrengthProfile())
    expect(result.coverage.metrics.bodyweightLane).toEqual({
      family: 'bodyweight_specific',
      reasonCodes: [],
      signalCount: 2,
      status: 'ready',
    })
    expect(result.bodyweightLane).toEqual({
      relevant: true,
      exerciseSummaries: [
        {
          exerciseId: 7,
          exerciseName: 'Pull-Up',
          strictSessionCount: 2,
          weightedSessionCount: 1,
          latestStrictRepBest: 12,
          latestAddedLoadLbs: 25,
          lastSessionDate: '2026-04-02',
        },
      ],
      strictRepTrend: [
        {
          bestReps: 12,
          date: '2026-04-02',
          exerciseId: 7,
          exerciseName: 'Pull-Up',
        },
      ],
      weightedLoadTrend: [
        {
          addedWeightLbs: 25,
          date: '2026-04-03',
          exerciseId: 7,
          exerciseName: 'Pull-Up',
          reps: 6,
        },
      ],
    })
  })
})

describe('deriveRecentPrs', () => {
  it('returns the newest true PRs per exercise with improvement deltas', () => {
    const recentPrs = deriveRecentPrs([
      { date: '2026-03-01', exerciseId: 1, exerciseName: 'Bench Press', weight: 185, reps: 5, e1rm: 216 },
      { date: '2026-03-10', exerciseId: 1, exerciseName: 'Bench Press', weight: 190, reps: 5, e1rm: 221 },
      { date: '2026-03-15', exerciseId: 1, exerciseName: 'Bench Press', weight: 190, reps: 5, e1rm: 221.2 },
      { date: '2026-03-20', exerciseId: 2, exerciseName: 'Squat', weight: 275, reps: 6, e1rm: 330 },
    ])

    expect(recentPrs).toEqual([
      {
        date: '2026-03-20',
        exerciseId: 2,
        exerciseName: 'Squat',
        weight: 275,
        reps: 6,
        e1rm: 330,
        improvementLbs: null,
      },
      {
        date: '2026-03-10',
        exerciseId: 1,
        exerciseName: 'Bench Press',
        weight: 190,
        reps: 5,
        e1rm: 221,
        improvementLbs: 5,
      },
      {
        date: '2026-03-01',
        exerciseId: 1,
        exerciseName: 'Bench Press',
        weight: 185,
        reps: 5,
        e1rm: 216,
        improvementLbs: null,
      },
    ])
  })
})

describe('weekly aggregation helpers', () => {
  it('aggregates weekly volume and backfills inactive weeks', () => {
    const volumeTrend = [
      { weekStart: '2026-03-30', exerciseId: 1, exerciseName: 'Squat', totalVolume: 5000, totalSets: 4 },
      { weekStart: '2026-03-30', exerciseId: 2, exerciseName: 'Bench Press', totalVolume: 3000, totalSets: 3 },
      { weekStart: '2026-04-06', exerciseId: 1, exerciseName: 'Squat', totalVolume: 5400, totalSets: 4 },
    ]

    expect(aggregateWeeklyVolume(volumeTrend)).toEqual([
      { weekStart: '2026-03-30', totalVolume: 8000, totalSets: 7 },
      { weekStart: '2026-04-06', totalVolume: 5400, totalSets: 4 },
    ])

    expect(buildWeeklyActivity(volumeTrend, 3, '2026-04-08')).toEqual([
      { weekStart: '2026-03-23', totalVolume: 0, totalSets: 0, isActive: false },
      { weekStart: '2026-03-30', totalVolume: 8000, totalSets: 7, isActive: true },
      { weekStart: '2026-04-06', totalVolume: 5400, totalSets: 4, isActive: true },
    ])
  })
})
