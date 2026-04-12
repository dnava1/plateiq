import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const nextServerMocks = vi.hoisted(() => ({
  next: vi.fn(),
  redirect: vi.fn(),
}))

const supabaseMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}))

vi.mock('next/server', () => ({
  NextResponse: {
    next: nextServerMocks.next,
    redirect: nextServerMocks.redirect,
  },
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: supabaseMocks.createServerClient,
}))

import { updateSession } from './middleware'

function createRequest(pathname: string) {
  const clonedUrl = { pathname }

  return {
    cookies: {
      getAll: vi.fn().mockReturnValue([]),
      set: vi.fn(),
    },
    nextUrl: {
      pathname,
      clone: vi.fn(() => clonedUrl),
    },
  } as unknown as NextRequest
}

describe('updateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('bypasses Supabase session handling for API routes', async () => {
    const nextResponse = { kind: 'next' }
    nextServerMocks.next.mockReturnValue(nextResponse)

    const result = await updateSession(createRequest('/api/insights/generate'))

    expect(nextServerMocks.next).toHaveBeenCalledWith()
    expect(supabaseMocks.createServerClient).not.toHaveBeenCalled()
    expect(result).toBe(nextResponse)
  })

  it('redirects unauthenticated protected page requests to login', async () => {
    const nextResponse = { cookies: { set: vi.fn() } }
    const redirectResponse = { kind: 'redirect' }
    nextServerMocks.next.mockReturnValue(nextResponse)
    nextServerMocks.redirect.mockReturnValue(redirectResponse)
    supabaseMocks.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    })

    const request = createRequest('/dashboard')
    const result = await updateSession(request)
    const redirectTarget = nextServerMocks.redirect.mock.calls[0]?.[0] as { pathname: string }

    expect(supabaseMocks.createServerClient).toHaveBeenCalledOnce()
    expect(nextServerMocks.redirect).toHaveBeenCalledOnce()
    expect(redirectTarget.pathname).toBe('/login')
    expect(result).toBe(redirectResponse)
  })
})