import {
  ACCOUNT_EXPORT_ERROR_MESSAGE,
  ACCOUNT_EXPORT_FORMAT,
  ACCOUNT_EXPORT_ROUTE,
  parseAccountExportFilename,
} from '@/lib/export/account-export'

export type AccountExportDownloadResult = {
  filename: string
}

export type AccountExportRequestError = Error & {
  statusCode?: number
}

async function parseExportError(response: Response) {
  try {
    const body = await response.json() as { error?: string } | null

    if (body && typeof body.error === 'string' && body.error.length > 0) {
      return body.error
    }
  } catch {
    // Fall back to the generic message below when the response body is unreadable.
  }

  return ACCOUNT_EXPORT_ERROR_MESSAGE
}

export function saveAccountExportBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'

  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl)
  }, 0)
}

export async function downloadAccountExport(signal?: AbortSignal): Promise<AccountExportDownloadResult> {
  const response = await fetch(ACCOUNT_EXPORT_ROUTE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ format: ACCOUNT_EXPORT_FORMAT }),
    signal,
  })

  if (!response.ok) {
    const error = new Error(await parseExportError(response)) as AccountExportRequestError
    error.statusCode = response.status
    throw error
  }

  const blob = await response.blob()
  const filename = parseAccountExportFilename(response.headers.get('Content-Disposition'))

  saveAccountExportBlob(blob, filename)

  return { filename }
}