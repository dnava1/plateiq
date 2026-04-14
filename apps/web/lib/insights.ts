import { GoogleGenAI, Type, type Schema } from '@google/genai'
import { aggregateWeeklyVolume, deriveRecentPrs } from '@/lib/analytics'
import { trainingInsightSchema } from '@/lib/validations/insights'
import type { AnalyticsData, AnalyticsE1rmPoint } from '@/types/analytics'
import type { GenerateInsightInput, InsightSnapshot, TrainingInsight } from '@/types/insights'

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'
const AI_REQUEST_TIMEOUT_MS = 10_000
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000
const MAX_RECENT_PRS = 3
const MAX_E1RM_HIGHLIGHTS = 3
const MAX_STALLED_LIFTS = 3
const MAX_BALANCE_ENTRIES = 4

const GEMINI_INSIGHT_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ['summary', 'strengths', 'concerns', 'recommendations'],
  propertyOrdering: ['summary', 'strengths', 'concerns', 'recommendations'],
  properties: {
    summary: {
      type: Type.STRING,
      description: 'A concise 2-3 sentence training summary.',
    },
    strengths: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      minItems: '1',
      maxItems: '4',
    },
    concerns: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      minItems: '1',
      maxItems: '4',
    },
    recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      minItems: '1',
      maxItems: '4',
    },
  },
}

type InsightAiClient = Pick<GoogleGenAI, 'models'>

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10
}

function roundToWhole(value: number) {
  return Math.round(value)
}

function parseIsoDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

function calculateWindowDays(dateFrom: string, dateTo: string) {
  const difference = parseIsoDate(dateTo).getTime() - parseIsoDate(dateFrom).getTime()
  return Math.max(1, Math.floor(difference / MILLISECONDS_PER_DAY) + 1)
}

function resolveExerciseScope(filter: GenerateInsightInput, analytics: AnalyticsData) {
  const fallbackName = analytics.e1rmTrend[0]?.exerciseName
    ?? analytics.prHistory[0]?.exerciseName
    ?? analytics.volumeTrend[0]?.exerciseName
    ?? null

  if (filter.exerciseId && fallbackName) {
    return fallbackName
  }

  return filter.exerciseId ? 'Selected exercise' : 'All exercises'
}

function buildE1rmHighlights(points: AnalyticsE1rmPoint[]) {
  const grouped = new Map<number, { exerciseName: string; first: AnalyticsE1rmPoint; last: AnalyticsE1rmPoint }>()

  for (const point of [...points].sort((left, right) => left.date.localeCompare(right.date))) {
    const current = grouped.get(point.exerciseId)

    if (!current) {
      grouped.set(point.exerciseId, {
        exerciseName: point.exerciseName,
        first: point,
        last: point,
      })
      continue
    }

    current.last = point
  }

  return Array.from(grouped.values())
    .map(({ exerciseName, first, last }) => ({
      exerciseName,
      latestE1rm: roundToTenth(last.e1rm),
      changeLbs: roundToTenth(last.e1rm - first.e1rm),
      lastDate: last.date,
      sourceWeight: last.weight,
      sourceReps: last.reps,
    }))
    .sort((left, right) => right.lastDate.localeCompare(left.lastDate))
    .slice(0, MAX_E1RM_HIGHLIGHTS)
}

function buildDataGaps(analytics: AnalyticsData) {
  const gaps: string[] = []

  if (analytics.e1rmTrend.length === 0) {
    gaps.push('No estimated 1RM trend points are available in the current filter.')
  }

  if (analytics.prHistory.length === 0) {
    gaps.push('No PR events were recorded in the current filter.')
  }

  if (analytics.stallDetection.length === 0) {
    gaps.push('No plateaued lifts were flagged in the current filter.')
  }

  if (analytics.muscleBalance.length === 0) {
    gaps.push('No movement balance data is available in the current filter.')
  }

  return gaps
}

function buildInsightPrompt(snapshot: InsightSnapshot) {
  return [
    'You are a pragmatic strength coach reviewing the user\'s analytics snapshot.',
    'Return strict JSON that matches the requested schema.',
    'Use only the evidence in the snapshot. Do not invent lifts, PRs, dates, injuries, or metrics.',
    'Address the user directly in second person. Prefer "you" and "your" over phrases like "the athlete".',
    'Keep the summary concise and specific.',
    'Each strength, concern, and recommendation item should be a single sentence.',
    'Recommendations should focus on the next 1-2 weeks and should stay practical.',
    'Concerns should stay in coaching scope and must not provide medical diagnosis.',
    `Snapshot: ${JSON.stringify(snapshot)}`,
  ].join('\n')
}

function stripCodeFence(value: string) {
  const trimmed = value.trim()
  if (!trimmed.startsWith('```')) {
    return trimmed
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

function extractJsonValue(text: string) {
  const cleaned = stripCodeFence(text)

  try {
    return JSON.parse(cleaned)
  } catch {
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
    }
  }

  throw { statusCode: 502, publicMessage: 'The AI provider returned an unreadable insight.' }
}

function normalizeInsightList(items: string[]) {
  return Array.from(new Set(items.map((item) => normalizeCoachingVoice(item.trim())).filter(Boolean))).slice(0, 4)
}

function normalizeCoachingVoice(text: string) {
  const normalized = text
    .replace(/\bthe athlete's\b/gi, 'your')
    .replace(/\bthe lifter's\b/gi, 'your')
    .replace(/\bthe athlete is\b/gi, 'you are')
    .replace(/\bthe lifter is\b/gi, 'you are')
    .replace(/\bthe athlete has\b/gi, 'you have')
    .replace(/\bthe lifter has\b/gi, 'you have')
    .replace(/\bthe athlete should\b/gi, 'you should')
    .replace(/\bthe lifter should\b/gi, 'you should')
    .replace(/\bthe athlete needs\b/gi, 'you need')
    .replace(/\bthe lifter needs\b/gi, 'you need')
    .replace(/\bthe athlete\b/gi, 'you')
    .replace(/\bthe lifter\b/gi, 'you')
    .replace(/\btheir\b/gi, 'your')
    .replace(/\bthey are\b/gi, 'you are')
    .replace(/\bthey have\b/gi, 'you have')
    .replace(/\bthey should\b/gi, 'you should')
    .replace(/\bthey need\b/gi, 'you need')

  return normalized.replace(/(^|[.!?]\s+)(you|your)\b/g, (match, prefix: string, pronoun: string) => {
    return `${prefix}${pronoun.charAt(0).toUpperCase()}${pronoun.slice(1)}`
  })
}

export function parseTrainingInsightResponse(value: unknown): TrainingInsight {
  const raw = typeof value === 'string' ? extractJsonValue(value) : value
  const parsed = trainingInsightSchema.safeParse(raw)

  if (!parsed.success) {
    throw { statusCode: 502, publicMessage: 'The AI provider returned an invalid insight format.' }
  }

  const normalized = {
    summary: normalizeCoachingVoice(parsed.data.summary.trim()),
    strengths: normalizeInsightList(parsed.data.strengths),
    concerns: normalizeInsightList(parsed.data.concerns),
    recommendations: normalizeInsightList(parsed.data.recommendations),
  }

  const validated = trainingInsightSchema.safeParse(normalized)

  if (!validated.success) {
    throw { statusCode: 502, publicMessage: 'The AI provider returned an incomplete insight.' }
  }

  return validated.data
}

export function buildAnalyticsInsightSnapshot(
  analytics: AnalyticsData,
  filter: GenerateInsightInput,
): InsightSnapshot {
  const weeklyVolume = aggregateWeeklyVolume(analytics.volumeTrend)
  const currentWeekVolume = weeklyVolume.at(-1)?.totalVolume ?? 0
  const trailingWindow = weeklyVolume.slice(Math.max(0, weeklyVolume.length - 5), weeklyVolume.length - 1)
  const trailingAverageVolume = trailingWindow.length > 0
    ? trailingWindow.reduce((total, entry) => total + entry.totalVolume, 0) / trailingWindow.length
    : 0
  const peakWeekVolume = weeklyVolume.reduce(
    (highest, entry) => Math.max(highest, entry.totalVolume),
    0,
  )
  const totalVolume = weeklyVolume.reduce((total, entry) => total + entry.totalVolume, 0)
  const recentPrs = deriveRecentPrs(analytics.prHistory, MAX_RECENT_PRS)

  return {
    filter: {
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo,
      windowDays: calculateWindowDays(filter.dateFrom, filter.dateTo),
      exerciseScope: resolveExerciseScope(filter, analytics),
    },
    consistency: {
      totalSessions: analytics.consistency.totalSessions,
      weeksActive: analytics.consistency.weeksActive,
      averageSessionsPerWeek: analytics.consistency.weeksActive > 0
        ? roundToTenth(analytics.consistency.totalSessions / analytics.consistency.weeksActive)
        : 0,
      firstSession: analytics.consistency.firstSession,
      lastSession: analytics.consistency.lastSession,
    },
    strength: {
      recentPrs: recentPrs.map((entry) => ({
        exerciseName: entry.exerciseName,
        date: entry.date,
        e1rm: roundToTenth(entry.e1rm),
        weight: entry.weight,
        reps: entry.reps,
        improvementLbs: entry.improvementLbs === null ? null : roundToTenth(entry.improvementLbs),
      })),
      e1rmHighlights: buildE1rmHighlights(analytics.e1rmTrend),
      stalledLifts: [...analytics.stallDetection]
        .sort((left, right) => right.weeksSincePr - left.weeksSincePr)
        .slice(0, MAX_STALLED_LIFTS)
        .map((entry) => ({
          exerciseName: entry.exerciseName,
          lastPrDate: entry.lastPrDate,
          weeksSincePr: entry.weeksSincePr,
        })),
    },
    volume: {
      currentWeekVolume: roundToWhole(currentWeekVolume),
      trailingAverageVolume: roundToWhole(trailingAverageVolume),
      peakWeekVolume: roundToWhole(peakWeekVolume),
      totalVolume: roundToWhole(totalVolume),
      activeWeeksWithVolume: weeklyVolume.filter((entry) => entry.totalSets > 0).length,
    },
    balance: analytics.muscleBalance
      .slice(0, MAX_BALANCE_ENTRIES)
      .map((entry) => ({
        movementPattern: entry.movementPattern,
        volumePct: roundToTenth(entry.volumePct),
        totalVolume: roundToWhole(entry.totalVolume),
      })),
    dataGaps: buildDataGaps(analytics),
  }
}

function resolveProviderStatus(error: unknown) {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status
    return typeof status === 'number' ? status : null
  }

  return null
}

function isProviderTimeoutError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const name = error.name.toLowerCase()
  const message = error.message.toLowerCase()

  return name.includes('timeout') || message.includes('timeout') || message.includes('timed out')
}

function isProviderConnectionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const name = error.name.toLowerCase()
  const message = error.message.toLowerCase()

  return name.includes('connection') || message.includes('network') || message.includes('fetch failed')
}

function createAiClient(apiKey: string) {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: AI_REQUEST_TIMEOUT_MS,
      retryOptions: {
        attempts: 1,
      },
    },
  })
}

export async function generateTrainingInsight(
  snapshot: InsightSnapshot,
  options?: {
    ai?: InsightAiClient
    apiKey?: string
    model?: string
  },
): Promise<TrainingInsight> {
  const apiKey = options?.apiKey ?? process.env.GEMINI_API_KEY?.trim()

  if (!apiKey && !options?.ai) {
    throw {
      statusCode: 503,
      publicMessage: process.env.NODE_ENV === 'development'
        ? 'AI insights are not configured. Set GEMINI_API_KEY in apps/web/.env.local and restart the dev server.'
        : 'AI insights are not configured on this deployment.',
    }
  }

  const model = options?.model ?? process.env.GEMINI_MODEL?.trim() ?? DEFAULT_GEMINI_MODEL
  const ai = options?.ai ?? createAiClient(apiKey!)

  try {
    const response = await ai.models.generateContent({
      model,
      contents: buildInsightPrompt(snapshot),
      config: {
        maxOutputTokens: 800,
        responseMimeType: 'application/json',
        responseSchema: GEMINI_INSIGHT_RESPONSE_SCHEMA,
        temperature: 0.4,
      },
    })

    return parseTrainingInsightResponse(response.text)
  } catch (error) {
    const status = resolveProviderStatus(error)

    if (isProviderTimeoutError(error)) {
      throw {
        statusCode: 504,
        publicMessage: 'AI insights timed out. Try again later.',
      }
    }

    if (isProviderConnectionError(error)) {
      throw {
        statusCode: 502,
        publicMessage: 'AI insights are temporarily unavailable. Try again later.',
      }
    }

    if (status === 429) {
      throw {
        statusCode: 429,
        publicMessage: 'AI insights are temporarily unavailable because the provider quota was exceeded. Try again later.',
      }
    }

    if (status !== null && status >= 500) {
      throw {
        statusCode: 502,
        publicMessage: 'AI insights are temporarily unavailable. Try again later.',
      }
    }

    if (status !== null) {
      throw {
        statusCode: 502,
        publicMessage: 'AI insights could not be generated because the provider rejected the request.',
      }
    }

    throw error
  }
}