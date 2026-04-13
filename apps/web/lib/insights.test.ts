import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyStrengthProfile } from './strength-profile'
import { buildAnalyticsInsightSnapshot, generateTrainingInsight, parseTrainingInsightResponse } from './insights'
import type { AnalyticsData } from '@/types/analytics'

const analyticsFixture: AnalyticsData = {
  e1rmTrend: [
    { date: '2026-03-01', exerciseId: 1, exerciseName: 'Bench Press', weight: 205, reps: 5, e1rm: 230.6 },
    { date: '2026-03-20', exerciseId: 1, exerciseName: 'Bench Press', weight: 215, reps: 5, e1rm: 241.9 },
  ],
  volumeTrend: [
    { weekStart: '2026-03-02', exerciseId: 1, exerciseName: 'Bench Press', totalVolume: 3200, totalSets: 5 },
    { weekStart: '2026-03-09', exerciseId: 1, exerciseName: 'Bench Press', totalVolume: 3400, totalSets: 5 },
    { weekStart: '2026-03-16', exerciseId: 1, exerciseName: 'Bench Press', totalVolume: 3600, totalSets: 6 },
  ],
  prHistory: [
    { date: '2026-03-01', exerciseId: 1, exerciseName: 'Bench Press', weight: 205, reps: 5, e1rm: 230.6 },
    { date: '2026-03-20', exerciseId: 1, exerciseName: 'Bench Press', weight: 215, reps: 5, e1rm: 241.9 },
  ],
  consistency: {
    totalSessions: 8,
    weeksActive: 4,
    firstSession: '2026-02-20',
    lastSession: '2026-03-20',
  },
  muscleBalance: [
    { movementPattern: 'push', totalVolume: 7200, volumePct: 62.3 },
    { movementPattern: 'pull', totalVolume: 4350, volumePct: 37.7 },
  ],
  stallDetection: [
    { exerciseId: 2, exerciseName: 'Squat', lastPrDate: '2026-02-10', weeksSincePr: 6 },
  ],
  tmProgression: [],
  strengthProfile: createEmptyStrengthProfile(),
}

describe('insights', () => {
  const mutableEnv = process.env as Record<string, string | undefined>
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY
    delete process.env.GEMINI_MODEL
    mutableEnv.NODE_ENV = originalNodeEnv
  })

  it('buildAnalyticsInsightSnapshot creates a compact summary for prompting', () => {
    const snapshot = buildAnalyticsInsightSnapshot(analyticsFixture, {
      dateFrom: '2026-02-20',
      dateTo: '2026-03-20',
      exerciseId: 1,
    })

    expect(snapshot.filter).toEqual({
      dateFrom: '2026-02-20',
      dateTo: '2026-03-20',
      windowDays: 29,
      exerciseScope: 'Bench Press',
    })
    expect(snapshot.consistency.averageSessionsPerWeek).toBe(2)
    expect(snapshot.strength.recentPrs).toHaveLength(2)
    expect(snapshot.strength.e1rmHighlights[0]).toMatchObject({
      exerciseName: 'Bench Press',
      latestE1rm: 241.9,
      changeLbs: 11.3,
    })
    expect(snapshot.volume).toMatchObject({
      currentWeekVolume: 3600,
      trailingAverageVolume: 3300,
      peakWeekVolume: 3600,
      totalVolume: 10200,
      activeWeeksWithVolume: 3,
    })
    expect(snapshot.balance[0]).toMatchObject({ movementPattern: 'push', volumePct: 62.3 })
  })

  it('parseTrainingInsightResponse accepts JSON wrapped in code fences', () => {
    const parsed = parseTrainingInsightResponse(
      '```json\n'
      + '{\n'
      + '  "summary": "Progress is trending well.",\n'
      + '  "strengths": ["Bench press is moving up steadily."],\n'
      + '  "concerns": ["Squat PR pace has slowed."],\n'
      + '  "recommendations": ["Keep bench volume stable this week."]\n'
      + '}\n'
      + '```',
    )

    expect(parsed).toEqual({
      summary: 'Progress is trending well.',
      strengths: ['Bench press is moving up steadily.'],
      concerns: ['Squat PR pace has slowed.'],
      recommendations: ['Keep bench volume stable this week.'],
    })
  })

  it('parseTrainingInsightResponse rejects malformed provider output', () => {
    expect(() => parseTrainingInsightResponse('not json at all')).toThrow()
  })

  it('parseTrainingInsightResponse normalizes common third-person phrasing to second person', () => {
    const parsed = parseTrainingInsightResponse({
      summary: 'the athlete is trending well and they should keep squat volume steady. the lifter should stay patient.',
      strengths: ['the athlete kept their bench volume consistent.', 'the athlete\'s squat is improving.'],
      concerns: ['they need more pull volume.'],
      recommendations: ['the lifter should add one top set next week.'],
    })

    expect(parsed).toEqual({
      summary: 'You are trending well and you should keep squat volume steady. You should stay patient.',
      strengths: ['You kept your bench volume consistent.', 'Your squat is improving.'],
      concerns: ['You need more pull volume.'],
      recommendations: ['You should add one top set next week.'],
    })
  })

  it('generateTrainingInsight uses the configured model and parses the provider response', async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        summary: 'Bench press is trending up while squat needs attention.',
        strengths: ['Bench press estimated 1RM is climbing.'],
        concerns: ['Squat has gone several weeks without a PR.'],
        recommendations: ['Add one high-quality squat top set next week.'],
      }),
    })

    const snapshot = buildAnalyticsInsightSnapshot(analyticsFixture, {
      dateFrom: '2026-02-20',
      dateTo: '2026-03-20',
      exerciseId: null,
    })

    await expect(
      generateTrainingInsight(snapshot, {
        ai: { models: { generateContent } } as never,
        model: 'gemini-2.5-flash-lite',
      }),
    ).resolves.toMatchObject({
      strengths: ['Bench press estimated 1RM is climbing.'],
    })

    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-flash-lite',
        contents: expect.stringContaining('Address the user directly in second person.'),
        config: expect.objectContaining({
          responseMimeType: 'application/json',
          temperature: 0.4,
        }),
      }),
    )
  })

  it('generateTrainingInsight maps provider quota failures to a public 429 error', async () => {
    const snapshot = buildAnalyticsInsightSnapshot(analyticsFixture, {
      dateFrom: '2026-02-20',
      dateTo: '2026-03-20',
      exerciseId: null,
    })

    await expect(
      generateTrainingInsight(snapshot, {
        ai: {
          models: {
            generateContent: async () => {
              throw { status: 429 }
            },
          },
        } as never,
      }),
    ).rejects.toMatchObject({
      statusCode: 429,
      publicMessage: expect.stringMatching(/provider quota/i),
    })
  })

  it('generateTrainingInsight maps timeout failures to a public 504 error', async () => {
    const snapshot = buildAnalyticsInsightSnapshot(analyticsFixture, {
      dateFrom: '2026-02-20',
      dateTo: '2026-03-20',
      exerciseId: null,
    })

    await expect(
      generateTrainingInsight(snapshot, {
        ai: {
          models: {
            generateContent: async () => {
              const error = new Error('Request timed out after waiting for the provider response.')
              error.name = 'APIConnectionTimeoutError'
              throw error
            },
          },
        } as never,
      }),
    ).rejects.toMatchObject({
      statusCode: 504,
      publicMessage: 'AI insights timed out. Try again later.',
    })
  })

  it('generateTrainingInsight maps connection failures to a public 502 error', async () => {
    const snapshot = buildAnalyticsInsightSnapshot(analyticsFixture, {
      dateFrom: '2026-02-20',
      dateTo: '2026-03-20',
      exerciseId: null,
    })

    await expect(
      generateTrainingInsight(snapshot, {
        ai: {
          models: {
            generateContent: async () => {
              const error = new Error('Network request failed while contacting the provider.')
              error.name = 'APIConnectionError'
              throw error
            },
          },
        } as never,
      }),
    ).rejects.toMatchObject({
      statusCode: 502,
      publicMessage: 'AI insights are temporarily unavailable. Try again later.',
    })
  })

  it('generateTrainingInsight returns an actionable missing-key message in development', async () => {
    mutableEnv.NODE_ENV = 'development'

    const snapshot = buildAnalyticsInsightSnapshot(analyticsFixture, {
      dateFrom: '2026-02-20',
      dateTo: '2026-03-20',
      exerciseId: null,
    })

    await expect(generateTrainingInsight(snapshot)).rejects.toMatchObject({
      statusCode: 503,
      publicMessage: 'AI insights are not configured. Set GEMINI_API_KEY in apps/web/.env.local and restart the dev server.',
    })
  })
})