import { NextResponse } from 'next/server'
import { hasInsightEligibleAnalyticsData, parseAnalyticsData } from '@/lib/analytics'
import { buildAnalyticsInsightSnapshot, generateTrainingInsight } from '@/lib/insights'
import { createClient } from '@/lib/supabase/server'
import { generateInsightRequestSchema } from '@/lib/validations/insights'

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
}

const INSIGHT_DAILY_LIMIT = 3

export const runtime = 'nodejs'

function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin')
  return Boolean(origin) && origin === new URL(request.url).origin
}

function createResponseHeaders(extra: Record<string, string> = {}) {
  return {
    ...NO_STORE_HEADERS,
    ...extra,
  }
}

type InsightQuota = {
  allowed: boolean
  limit: number
  used: number
  remaining: number
  resetAt: string
}

function parseInsightQuota(data: unknown): InsightQuota | null {
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

function buildRateLimitHeaders(quota: InsightQuota) {
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

function toErrorResponse(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const statusCode = 'statusCode' in error ? (error as { statusCode?: unknown }).statusCode : undefined
    const publicMessage = 'publicMessage' in error ? (error as { publicMessage?: unknown }).publicMessage : undefined

    if (typeof statusCode === 'number' && typeof publicMessage === 'string') {
      return { status: statusCode, message: publicMessage }
    }
  }

  return {
    status: 500,
    message: 'Unable to generate an insight right now.',
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: createResponseHeaders() })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Request body must be valid JSON.' },
      { status: 400, headers: createResponseHeaders() },
    )
  }

  const parsedRequest = generateInsightRequestSchema.safeParse(body)

  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: parsedRequest.error.issues[0]?.message ?? 'Invalid insight request.' },
      { status: 400, headers: createResponseHeaders() },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: createResponseHeaders() })
  }

  const { data, error } = await supabase.rpc('get_analytics_data', {
    ...(parsedRequest.data.exerciseId ? { p_exercise_id: parsedRequest.data.exerciseId } : {}),
    p_date_from: parsedRequest.data.dateFrom,
    p_date_to: parsedRequest.data.dateTo,
  })

  if (error) {
    console.error('analytics insight rpc failed', {
      operation: 'get_analytics_data',
      dateFrom: parsedRequest.data.dateFrom,
      dateTo: parsedRequest.data.dateTo,
      exerciseId: parsedRequest.data.exerciseId,
      message: error.message,
    })

    return NextResponse.json(
      { error: 'Unable to load analytics for insight generation.' },
      { status: 500, headers: createResponseHeaders() },
    )
  }

  const analytics = parseAnalyticsData(data)

  if (!hasInsightEligibleAnalyticsData(analytics)) {
    return NextResponse.json(
      { error: 'There is not enough comparable analytics history to generate an insight yet.' },
      { status: 400, headers: createResponseHeaders() },
    )
  }

  const { data: quotaData, error: quotaError } = await supabase.rpc('consume_ai_insight_daily_quota', {
    p_daily_limit: INSIGHT_DAILY_LIMIT,
  })

  if (quotaError) {
    console.error('analytics insight quota check failed', {
      operation: 'consume_ai_insight_daily_quota',
      dateFrom: parsedRequest.data.dateFrom,
      dateTo: parsedRequest.data.dateTo,
      exerciseId: parsedRequest.data.exerciseId,
      message: quotaError.message,
    })

    return NextResponse.json(
      { error: 'Unable to validate the daily AI insight quota right now.' },
      { status: 500, headers: createResponseHeaders() },
    )
  }

  const quota = parseInsightQuota(quotaData)

  if (!quota) {
    console.error('analytics insight quota returned an unexpected payload', {
      operation: 'consume_ai_insight_daily_quota',
      dateFrom: parsedRequest.data.dateFrom,
      dateTo: parsedRequest.data.dateTo,
      exerciseId: parsedRequest.data.exerciseId,
      quotaData,
    })

    return NextResponse.json(
      { error: 'Unable to validate the daily AI insight quota right now.' },
      { status: 500, headers: createResponseHeaders() },
    )
  }

  const rateLimitHeaders = buildRateLimitHeaders(quota)

  if (!quota.allowed) {
    return NextResponse.json(
      { error: `Daily AI insight limit reached. You can generate up to ${INSIGHT_DAILY_LIMIT} insights per UTC day.` },
      { status: 429, headers: createResponseHeaders(rateLimitHeaders) },
    )
  }

  try {
    const snapshot = buildAnalyticsInsightSnapshot(analytics, parsedRequest.data)
    const insight = await generateTrainingInsight(snapshot)

    return NextResponse.json(insight, { status: 200, headers: createResponseHeaders(rateLimitHeaders) })
  } catch (error) {
    const response = toErrorResponse(error)
    const loggedMessage = error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'publicMessage' in error && typeof (error as { publicMessage?: unknown }).publicMessage === 'string'
        ? (error as { publicMessage: string }).publicMessage
        : String(error)

    console.error('analytics insight generation failed', {
      operation: 'generateTrainingInsight',
      dateFrom: parsedRequest.data.dateFrom,
      dateTo: parsedRequest.data.dateTo,
      exerciseId: parsedRequest.data.exerciseId,
      status: response.status,
      message: loggedMessage,
    })

    return NextResponse.json(
      { error: response.message },
      { status: response.status, headers: createResponseHeaders(rateLimitHeaders) },
    )
  }
}
