import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadAccountExport } from '@/lib/export/account-export-client'

describe('downloadAccountExport', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn())
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:training-export'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('posts the export request and triggers a browser download', async () => {
    const fetchMock = vi.mocked(fetch)

    fetchMock.mockResolvedValue(new Response(new Blob(['zip-bytes']), {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename="plateiq-export-20260512T143000Z.zip"',
        'Content-Type': 'application/zip',
      },
    }))

    await expect(downloadAccountExport()).resolves.toEqual({
      filename: 'plateiq-export-20260512T143000Z.zip',
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/export/account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ format: 'zip-json-v1' }),
      signal: undefined,
    })
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1)

    await vi.runAllTimersAsync()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:training-export')
  })

  it('surfaces the API error body on failed requests', async () => {
    const fetchMock = vi.mocked(fetch)

    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'Account export limit reached.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
      },
    }))

    await expect(downloadAccountExport()).rejects.toMatchObject({
      message: 'Account export limit reached.',
      statusCode: 429,
    })
  })
})