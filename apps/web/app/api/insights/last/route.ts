import { NextResponse } from 'next/server'
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/security/request'
import { createClient } from '@/lib/supabase/server'
import { aiInsightCacheRecordSchema, generateInsightRequestSchema } from '@/lib/validations/insights'

export const runtime = 'nodejs'

function createResponseHeaders(extra: Record<string, string> = {}) {
  return {
    ...PRIVATE_NO_STORE_HEADERS,
    ...extra,
  }
}

function parseInsightRequestFromUrl(request: Request) {
  const url = new URL(request.url)
  const exerciseIdParam = url.searchParams.get('exerciseId')

  return generateInsightRequestSchema.safeParse({
    dateFrom: url.searchParams.get('dateFrom') ?? '',
    dateTo: url.searchParams.get('dateTo') ?? '',
    exerciseId: exerciseIdParam && exerciseIdParam.trim().length > 0
      ? Number(exerciseIdParam)
      : null,
  })
}

export async function GET(request: Request) {
  const parsedRequest = parseInsightRequestFromUrl(request)

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

  const { data, error } = await supabase.rpc('get_ai_insight_cache', {
    ...(parsedRequest.data.exerciseId ? { p_exercise_id: parsedRequest.data.exerciseId } : {}),
    p_date_from: parsedRequest.data.dateFrom,
    p_date_to: parsedRequest.data.dateTo,
  })

  if (error) {
    console.error('analytics insight cache read failed', {
      operation: 'get_ai_insight_cache',
      dateFrom: parsedRequest.data.dateFrom,
      dateTo: parsedRequest.data.dateTo,
      exerciseId: parsedRequest.data.exerciseId,
      message: error.message,
    })

    return NextResponse.json(
      { error: 'Unable to load the last saved insight right now.' },
      { status: 500, headers: createResponseHeaders() },
    )
  }

  if (!data) {
    return new NextResponse(null, { status: 204, headers: createResponseHeaders() })
  }

  const parsedCacheRecord = aiInsightCacheRecordSchema.safeParse(data)

  if (!parsedCacheRecord.success) {
    console.error('analytics insight cache returned an unexpected payload', {
      operation: 'get_ai_insight_cache',
      dateFrom: parsedRequest.data.dateFrom,
      dateTo: parsedRequest.data.dateTo,
      exerciseId: parsedRequest.data.exerciseId,
      payload: data,
    })

    return NextResponse.json(
      { error: 'Unable to load the last saved insight right now.' },
      { status: 500, headers: createResponseHeaders() },
    )
  }

  return NextResponse.json(
    {
      ...parsedCacheRecord.data.insight,
      generatedAt: parsedCacheRecord.data.generated_at,
      source: 'cached',
    },
    { status: 200, headers: createResponseHeaders() },
  )
}