import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // In Vercel, cron jobs include the CRON_SECRET header automatically
    // For local dev, skip auth check if no CRON_SECRET is set
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const { count } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({
    status: 'ok',
    exerciseCount: count,
    timestamp: new Date().toISOString(),
  })
}
