import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isSameOriginRequest, PRIVATE_NO_STORE_HEADERS } from '@/lib/security/request'
import { feedbackSubmissionSchema } from '@/lib/validations/feedback'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Request body must be valid JSON.' },
      { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
    )
  }

  const parsedRequest = feedbackSubmissionSchema.safeParse(body)

  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: parsedRequest.error.issues[0]?.message ?? 'Invalid feedback submission.' },
      { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('feedback_submissions')
    .insert({
      user_id: user.id,
      category: parsedRequest.data.category,
      message: parsedRequest.data.message,
      source_path: parsedRequest.data.sourcePath,
      status: 'new',
    })
    .select('id, created_at')
    .single()

  if (error || !data) {
    console.error('feedback submission failed', {
      operation: 'create_feedback_submission',
      category: parsedRequest.data.category,
      sourcePath: parsedRequest.data.sourcePath,
      message: error?.message ?? 'No row returned from insert.',
    })

    return NextResponse.json(
      { error: 'Unable to save feedback right now.' },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
    )
  }

  return NextResponse.json(
    {
      submissionId: data.id,
      createdAt: data.created_at,
    },
    { status: 201, headers: PRIVATE_NO_STORE_HEADERS },
  )
}
