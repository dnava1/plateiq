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
  const nextUrl = new URL(`https://plateiq.test${pathname}`)

  return {
    cookies: {
      getAll: vi.fn().mockReturnValue([]),
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
    },
    nextUrl: {
      pathname: nextUrl.pathname,
      search: nextUrl.search,
      searchParams: nextUrl.searchParams,
      clone: vi.fn(() => new URL(nextUrl.toString())),
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

  it('redirects unauthenticated protected page requests to continue', async () => {
    const nextResponse = { cookies: { set: vi.fn() } }
    const redirectResponse = { kind: 'redirect' }
    nextServerMocks.next.mockReturnValue(nextResponse)
    nextServerMocks.redirect.mockReturnValue(redirectResponse)
    supabaseMocks.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    })

    const request = createRequest('/dashboard?tab=analytics')
    const result = await updateSession(request)
    const redirectTarget = nextServerMocks.redirect.mock.calls[0]?.[0] as URL

    expect(supabaseMocks.createServerClient).toHaveBeenCalledOnce()
    expect(nextServerMocks.redirect).toHaveBeenCalledOnce()
    expect(redirectTarget.pathname).toBe('/continue')
    expect(redirectTarget.searchParams.get('next')).toBe('/dashboard?tab=analytics')
    expect(result).toBe(redirectResponse)
  })

  it('allows anonymous users through protected routes', async () => {
    const nextResponse = { kind: 'next', cookies: { set: vi.fn() } }
    nextServerMocks.next.mockReturnValue(nextResponse)
    supabaseMocks.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'guest-user',
              is_anonymous: true,
            },
          },
        }),
      },
    })

    const result = await updateSession(createRequest('/dashboard'))

    expect(nextServerMocks.redirect).not.toHaveBeenCalled()
    expect(result).toBe(nextResponse)
  })

  it('redirects signed-out users from removed login to continue', async () => {
    const nextResponse = { cookies: { set: vi.fn() } }
    const redirectResponse = { kind: 'redirect' }
    nextServerMocks.next.mockReturnValue(nextResponse)
    nextServerMocks.redirect.mockReturnValue(redirectResponse)
    supabaseMocks.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    })

    const result = await updateSession(createRequest('/login?next=%2Fanalytics'))
    const redirectTarget = nextServerMocks.redirect.mock.calls[0]?.[0] as URL

    expect(redirectTarget.pathname).toBe('/continue')
    expect(redirectTarget.searchParams.get('next')).toBe('/analytics')
    expect(result).toBe(redirectResponse)
  })

  it('redirects anonymous users away from removed auth routes to upgrade', async () => {
    const nextResponse = { cookies: { set: vi.fn() } }
    const redirectResponse = { kind: 'redirect' }
    nextServerMocks.next.mockReturnValue(nextResponse)
    nextServerMocks.redirect.mockReturnValue(redirectResponse)
    supabaseMocks.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'guest-user',
              is_anonymous: true,
            },
          },
        }),
      },
    })

    const result = await updateSession(createRequest('/create-account'))
    const redirectTarget = nextServerMocks.redirect.mock.calls[0]?.[0] as URL

    expect(redirectTarget.pathname).toBe('/upgrade')
    expect(result).toBe(redirectResponse)
  })

  it('preserves deep-link query parameters when anonymous users revisit continue', async () => {
    const nextResponse = { cookies: { set: vi.fn() } }
    const redirectResponse = { kind: 'redirect' }
    nextServerMocks.next.mockReturnValue(nextResponse)
    nextServerMocks.redirect.mockReturnValue(redirectResponse)
    supabaseMocks.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'guest-user',
              is_anonymous: true,
            },
          },
        }),
      },
    })

    const result = await updateSession(createRequest('/continue?next=%2Fdashboard%3Ftab%3Danalytics'))
    const redirectTarget = nextServerMocks.redirect.mock.calls[0]?.[0] as URL

    expect(redirectTarget.pathname).toBe('/dashboard')
    expect(redirectTarget.search).toBe('?tab=analytics')
    expect(result).toBe(redirectResponse)
  })

  it('redirects permanent users away from continue to the dashboard', async () => {
    const nextResponse = { cookies: { set: vi.fn() } }
    const redirectResponse = { kind: 'redirect' }
    nextServerMocks.next.mockReturnValue(nextResponse)
    nextServerMocks.redirect.mockReturnValue(redirectResponse)
    supabaseMocks.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'permanent-user',
              is_anonymous: false,
            },
          },
        }),
      },
    })

    const result = await updateSession(createRequest('/continue'))
    const redirectTarget = nextServerMocks.redirect.mock.calls[0]?.[0] as URL

    expect(redirectTarget.pathname).toBe('/dashboard')
    expect(result).toBe(redirectResponse)
  })

  it('redirects permanent users away from upgrade to the dashboard', async () => {
    const nextResponse = { cookies: { set: vi.fn() } }
    const redirectResponse = { kind: 'redirect' }
    nextServerMocks.next.mockReturnValue(nextResponse)
    nextServerMocks.redirect.mockReturnValue(redirectResponse)
    supabaseMocks.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'permanent-user',
              is_anonymous: false,
            },
          },
        }),
      },
    })

    const result = await updateSession(createRequest('/upgrade'))
    const redirectTarget = nextServerMocks.redirect.mock.calls[0]?.[0] as URL

    expect(redirectTarget.pathname).toBe('/dashboard')
    expect(result).toBe(redirectResponse)
  })
})