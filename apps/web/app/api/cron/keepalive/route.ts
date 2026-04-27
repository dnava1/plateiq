import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
}

export const runtime = 'nodejs'

function getCronSecret() {
  return process.env.CRON_SECRET?.trim() ?? null
}

export async function GET(request: Request) {
  const cronSecret = getCronSecret()

  if (!cronSecret) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Cron is not configured.' },
        { status: 503, headers: NO_STORE_HEADERS },
      )
    }
  } else if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS })
  }

  const supabase = createAdminClient()

  const { count, error } = await supabase
    .from('exercises')
    .select('id', { count: 'exact', head: true })

  if (error) {
    console.error('cron keepalive failed', {
      operation: 'exercise_count_healthcheck',
      message: error.message,
    })

    return NextResponse.json(
      { error: 'Unable to complete cron keepalive.' },
      { status: 500, headers: NO_STORE_HEADERS },
    )
  }

  return NextResponse.json({
    status: 'ok',
    exerciseCount: count,
    timestamp: new Date().toISOString(),
  }, { headers: NO_STORE_HEADERS })
}
