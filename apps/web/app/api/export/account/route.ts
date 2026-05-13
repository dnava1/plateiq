import { NextResponse } from 'next/server'
import {
  ACCOUNT_EXPORT_CONTENT_TYPE,
  ACCOUNT_EXPORT_ERROR_MESSAGE,
  ACCOUNT_EXPORT_GUEST_ERROR_MESSAGE,
  ACCOUNT_EXPORT_HOURLY_LIMIT,
  ACCOUNT_EXPORT_SERIALIZED_MAX_BYTES,
  ACCOUNT_EXPORT_TOO_LARGE_CODE,
  ACCOUNT_EXPORT_TOO_LARGE_ERROR_MESSAGE,
  buildAccountExportArchive,
  buildAccountExportRateLimitHeaders,
  getUtf8ByteLength,
  parseAccountExportQuota,
  serializeAccountExportServerPayload,
} from '@/lib/export/account-export'
import { isSameOriginRequest, PRIVATE_NO_STORE_HEADERS } from '@/lib/security/request'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  accountExportArchiveSchema,
  accountExportRequestSchema,
} from '@/lib/validations/account-export'

export const runtime = 'nodejs'

function createResponseHeaders(extra: Record<string, string> = {}) {
  return {
    ...PRIVATE_NO_STORE_HEADERS,
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  }
}

async function settleExportReservation(
  action: 'commit' | 'release',
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  reservationId: string,
) {
  const rpcName = action === 'commit'
    ? 'commit_account_export'
    : 'release_account_export_slot'

  const { data, error } = await admin.rpc(rpcName, {
    p_hourly_limit: ACCOUNT_EXPORT_HOURLY_LIMIT,
    p_reservation_id: reservationId,
    p_user_id: userId,
  })

  return {
    error,
    quota: parseAccountExportQuota(data),
  }
}

function createBinaryResponse(
  archive: ReturnType<typeof buildAccountExportArchive>,
  rateLimitHeaders: Record<string, string>,
) {
  return new NextResponse(new Blob([Uint8Array.from(archive.zipBytes)], { type: ACCOUNT_EXPORT_CONTENT_TYPE }), {
    status: 200,
    headers: createResponseHeaders({
      ...rateLimitHeaders,
      'Content-Disposition': `attachment; filename="${archive.filename}"`,
      'Content-Type': ACCOUNT_EXPORT_CONTENT_TYPE,
    }),
  })
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()

  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403, headers: createResponseHeaders() },
    )
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

  const parsedRequest = accountExportRequestSchema.safeParse(body)

  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: parsedRequest.error.issues[0]?.message ?? 'Invalid export request.' },
      { status: 400, headers: createResponseHeaders() },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: createResponseHeaders() },
    )
  }

  if (user.is_anonymous) {
    return NextResponse.json(
      { error: ACCOUNT_EXPORT_GUEST_ERROR_MESSAGE },
      { status: 403, headers: createResponseHeaders() },
    )
  }

  const admin = createAdminClient()
  const reservationId = crypto.randomUUID()
  const { data: reservationData, error: reservationError } = await admin.rpc('reserve_account_export_slot', {
    p_hourly_limit: ACCOUNT_EXPORT_HOURLY_LIMIT,
    p_reservation_id: reservationId,
    p_user_id: user.id,
  })

  if (reservationError) {
    console.error('account export quota reservation failed', {
      operation: 'reserve_account_export_slot',
      requestId,
      userId: user.id,
      message: reservationError.message,
    })

    return NextResponse.json(
      { error: ACCOUNT_EXPORT_ERROR_MESSAGE },
      { status: 500, headers: createResponseHeaders() },
    )
  }

  const quota = parseAccountExportQuota(reservationData)

  if (!quota) {
    console.error('account export quota returned an unexpected payload', {
      operation: 'reserve_account_export_slot',
      requestId,
      userId: user.id,
      reservationData,
    })

    return NextResponse.json(
      { error: ACCOUNT_EXPORT_ERROR_MESSAGE },
      { status: 500, headers: createResponseHeaders() },
    )
  }

  const reservationHeaders = buildAccountExportRateLimitHeaders(quota)

  if (!quota.allowed) {
    return NextResponse.json(
      { error: `Account export limit reached. You can prepare up to ${ACCOUNT_EXPORT_HOURLY_LIMIT} exports per UTC hour.` },
      { status: 429, headers: createResponseHeaders(reservationHeaders) },
    )
  }

  try {
    const { data, error } = await admin.rpc('export_my_training_graph_v1', {
      p_user_id: user.id,
    })

    if (error) {
      console.error('account export rpc failed', {
        operation: 'export_my_training_graph_v1',
        requestId,
        userId: user.id,
        message: error.message,
      })

      await settleExportReservation('release', admin, user.id, reservationId)

      return NextResponse.json(
        { error: ACCOUNT_EXPORT_ERROR_MESSAGE },
        { status: 500, headers: createResponseHeaders() },
      )
    }

    const parsedPayload = accountExportArchiveSchema.safeParse(data)

    if (!parsedPayload.success) {
      console.error('account export rpc returned an unexpected payload', {
        operation: 'export_my_training_graph_v1',
        requestId,
        userId: user.id,
        issues: parsedPayload.error.issues,
      })

      await settleExportReservation('release', admin, user.id, reservationId)

      return NextResponse.json(
        { error: ACCOUNT_EXPORT_ERROR_MESSAGE },
        { status: 500, headers: createResponseHeaders() },
      )
    }

    const serializedPayload = serializeAccountExportServerPayload(parsedPayload.data)
    const payloadBytes = getUtf8ByteLength(serializedPayload)

    if (payloadBytes > ACCOUNT_EXPORT_SERIALIZED_MAX_BYTES) {
      const committedQuota = await settleExportReservation('commit', admin, user.id, reservationId)
      const rateLimitHeaders = buildAccountExportRateLimitHeaders(committedQuota.quota ?? quota)

      if (committedQuota.error) {
        console.error('account export quota commit failed after size rejection', {
          operation: 'commit_account_export',
          requestId,
          userId: user.id,
          message: committedQuota.error.message,
          payloadBytes,
        })
      }

      return NextResponse.json(
        {
          code: ACCOUNT_EXPORT_TOO_LARGE_CODE,
          error: ACCOUNT_EXPORT_TOO_LARGE_ERROR_MESSAGE,
        },
        { status: 413, headers: createResponseHeaders(rateLimitHeaders) },
      )
    }

    const archive = buildAccountExportArchive(parsedPayload.data)
    const committedQuota = await settleExportReservation('commit', admin, user.id, reservationId)

    if (committedQuota.error) {
      console.error('account export quota commit failed', {
        operation: 'commit_account_export',
        requestId,
        userId: user.id,
        message: committedQuota.error.message,
      })

      await settleExportReservation('release', admin, user.id, reservationId)

      return NextResponse.json(
        { error: ACCOUNT_EXPORT_ERROR_MESSAGE },
        { status: 500, headers: createResponseHeaders() },
      )
    }

    return createBinaryResponse(
      archive,
      buildAccountExportRateLimitHeaders(committedQuota.quota ?? quota),
    )
  } catch (error) {
    console.error('account export route failed unexpectedly', {
      operation: 'account_export',
      requestId,
      userId: user.id,
      message: error instanceof Error ? error.message : String(error),
    })

    await settleExportReservation('release', admin, user.id, reservationId)

    return NextResponse.json(
      { error: ACCOUNT_EXPORT_ERROR_MESSAGE },
      { status: 500, headers: createResponseHeaders() },
    )
  }
}