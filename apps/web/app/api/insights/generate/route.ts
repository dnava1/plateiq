import { NextResponse } from 'next/server'
import { hasInsightEligibleAnalyticsData, parseAnalyticsData } from '@/lib/analytics'
import { buildAnalyticsInsightSnapshot, generateTrainingInsight } from '@/lib/insights'
import { createClient } from '@/lib/supabase/server'
import { generateInsightRequestSchema } from '@/lib/validations/insights'

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
}

export const runtime = 'nodejs'

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
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Request body must be valid JSON.' },
      { status: 400, headers: NO_STORE_HEADERS },
    )
  }

  const parsedRequest = generateInsightRequestSchema.safeParse(body)

  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: parsedRequest.error.issues[0]?.message ?? 'Invalid insight request.' },
      { status: 400, headers: NO_STORE_HEADERS },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS })
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
      { status: 500, headers: NO_STORE_HEADERS },
    )
  }

  const analytics = parseAnalyticsData(data)

  if (!hasInsightEligibleAnalyticsData(analytics)) {
    return NextResponse.json(
      { error: 'There is not enough method-aware analytics data to generate an insight yet.' },
      { status: 400, headers: NO_STORE_HEADERS },
    )
  }

  try {
    const snapshot = buildAnalyticsInsightSnapshot(analytics, parsedRequest.data)
    const insight = await generateTrainingInsight(snapshot)

    return NextResponse.json(insight, { status: 200, headers: NO_STORE_HEADERS })
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

    return NextResponse.json({ error: response.message }, { status: response.status, headers: NO_STORE_HEADERS })
  }
}