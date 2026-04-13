type MergeStatusResponse = {
  pending: boolean
  canFinalize: boolean
}

type PrepareGuestMergeResponse = {
  prepared: true
  expiresAt: string
}

async function parseErrorMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => null)
  return typeof body?.error === 'string' ? body.error : fallback
}

export async function clearPendingGuestMergeClient() {
  const response = await fetch('/api/auth/merge/cancel', {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Unable to clear the pending guest merge right now.'))
  }
}

export async function prepareGuestMergeClient(targetEmail: string) {
  const response = await fetch('/api/auth/merge/prepare', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ targetEmail }),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Unable to start an account merge right now.'))
  }

  return await response.json() as PrepareGuestMergeResponse
}

export async function finalizePendingGuestMergeClient() {
  const response = await fetch('/api/auth/merge/finalize', {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Unable to merge this guest session right now.'))
  }

  return await response.json()
}

export async function getPendingGuestMergeStatusClient() {
  const response = await fetch('/api/auth/merge/status', {
    method: 'GET',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Unable to load guest merge status right now.'))
  }

  return await response.json() as MergeStatusResponse
}