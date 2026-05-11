import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Providers } from './providers'

const mocks = vi.hoisted(() => ({
  cacheScopeHint: null as string | null,
  clearOfflineWorkoutState: vi.fn().mockResolvedValue(undefined),
  clearPersistedQueryCache: vi.fn().mockResolvedValue(undefined),
  createIdbPersister: vi.fn((userId: string) => {
    void userId

    return {
      persistClient: vi.fn().mockResolvedValue(undefined),
      removeClient: vi.fn().mockResolvedValue(undefined),
      restoreClient: vi.fn().mockResolvedValue(undefined),
    }
  }),
  getSession: vi.fn(() => new Promise(() => {})),
  onAuthStateChange: vi.fn(() => ({
    data: {
      subscription: {
        unsubscribe: vi.fn(),
      },
    },
  })),
  pathname: '/legal',
  probeSameOriginNetworkReachability: vi.fn().mockResolvedValue('reachable'),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}))

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: online,
  })
}

vi.mock('@tanstack/react-query', () => ({
  QueryClient: class QueryClient {
    cancelQueries = vi.fn().mockResolvedValue(undefined)
    clear = vi.fn()
    getMutationCache() {
      return { getAll: () => [] }
    }
    invalidateQueries = vi.fn()
    resumePausedMutations = vi.fn().mockResolvedValue(undefined)
  },
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="query-provider">{children}</div>
  ),
}))

vi.mock('@tanstack/react-query-persist-client', () => ({
  PersistQueryClientProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="persist-provider">{children}</div>
  ),
}))

vi.mock('@/lib/auth/session-user', () => ({
  getStoredAuthScopeHint: () => mocks.cacheScopeHint,
  probeSameOriginNetworkReachability: () => mocks.probeSameOriginNetworkReachability(),
}))

vi.mock('@/store/uiStore', () => ({
  useUiStore: (selector: (state: { theme: string }) => unknown) => selector({ theme: 'dark' }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  }),
}))

vi.mock('@/lib/query-persistence', () => ({
  clearLegacyPersistedQueryCache: vi.fn().mockResolvedValue(undefined),
  clearPersistedQueryCache: (userId: string) => mocks.clearPersistedQueryCache(userId),
  createIdbPersister: (userId: string) => mocks.createIdbPersister(userId),
  getQueryPersistenceBuster: (scope: string) => `buster:${scope}`,
  QUERY_CACHE_MAX_AGE: 1000 * 60 * 60 * 24,
}))

vi.mock('@/lib/offline-workout-store', () => ({
  clearOfflineWorkoutState: (userId: string) => mocks.clearOfflineWorkoutState(userId),
}))

describe('Providers', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mocks.cacheScopeHint = null
    mocks.clearOfflineWorkoutState.mockClear()
    mocks.clearPersistedQueryCache.mockClear()
    mocks.createIdbPersister.mockClear()
    mocks.getSession.mockImplementation(() => new Promise(() => {}))
    mocks.pathname = '/legal'
    mocks.probeSameOriginNetworkReachability.mockReset()
    mocks.probeSameOriginNetworkReachability.mockResolvedValue('reachable')
    setOnline(true)
  })

  it('boots persisted query restore immediately when a cached auth scope hint exists', () => {
    mocks.cacheScopeHint = 'user-123'

    render(
      <Providers>
        <div>child content</div>
      </Providers>,
    )

    expect(screen.getByTestId('persist-provider')).toBeInTheDocument()
    expect(mocks.createIdbPersister).toHaveBeenCalledWith('user-123')
    expect(screen.queryByText('Restoring saved data')).not.toBeInTheDocument()
  })

  it('defers hinted persisted restore on online launch boots until offline fallback is confirmed', () => {
    mocks.cacheScopeHint = 'user-123'
    mocks.pathname = '/launch'
    mocks.probeSameOriginNetworkReachability.mockReturnValue(new Promise(() => undefined))

    render(
      <Providers>
        <div>child content</div>
      </Providers>,
    )

    expect(screen.getByTestId('query-provider')).toBeInTheDocument()
    expect(screen.queryByTestId('persist-provider')).not.toBeInTheDocument()
    expect(mocks.createIdbPersister).not.toHaveBeenCalled()
  })

  it('restores the hinted cache on launch once the same-origin reachability probe fails', async () => {
    mocks.cacheScopeHint = 'user-123'
    mocks.pathname = '/launch'
    mocks.probeSameOriginNetworkReachability.mockResolvedValue('unreachable')

    render(
      <Providers>
        <div>child content</div>
      </Providers>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('persist-provider')).toBeInTheDocument()
    })

    expect(mocks.createIdbPersister).toHaveBeenCalledWith('user-123')
  })

  it('restores the hinted cache on gym boots once the same-origin reachability probe fails', async () => {
    mocks.cacheScopeHint = 'user-123'
    mocks.pathname = '/gym'
    mocks.probeSameOriginNetworkReachability.mockResolvedValue('unreachable')

    render(
      <Providers>
        <div>child content</div>
      </Providers>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('persist-provider')).toBeInTheDocument()
    })

    expect(mocks.createIdbPersister).toHaveBeenCalledWith('user-123')
  })

  it('keeps hinted restore disabled while launch reachability is indeterminate', async () => {
    mocks.cacheScopeHint = 'user-123'
    mocks.pathname = '/launch'
    mocks.probeSameOriginNetworkReachability.mockResolvedValue('unknown')

    render(
      <Providers>
        <div>child content</div>
      </Providers>,
    )

    await waitFor(() => {
      expect(mocks.probeSameOriginNetworkReachability).toHaveBeenCalledTimes(1)
    })

    expect(screen.getByTestId('query-provider')).toBeInTheDocument()
    expect(screen.queryByTestId('persist-provider')).not.toBeInTheDocument()
  })

  it('defers hinted persisted restore on direct authenticated route boots until auth resolves', () => {
    mocks.cacheScopeHint = 'user-123'
    mocks.pathname = '/dashboard'

    render(
      <Providers>
        <div>child content</div>
      </Providers>,
    )

    expect(screen.getByTestId('query-provider')).toBeInTheDocument()
    expect(screen.queryByTestId('persist-provider')).not.toBeInTheDocument()
    expect(mocks.createIdbPersister).not.toHaveBeenCalled()
  })

  it('defers hinted persisted restore on protected non-nav route boots until auth resolves', () => {
    mocks.cacheScopeHint = 'user-123'
    mocks.pathname = '/exercises'

    render(
      <Providers>
        <div>child content</div>
      </Providers>,
    )

    expect(screen.getByTestId('query-provider')).toBeInTheDocument()
    expect(screen.queryByTestId('persist-provider')).not.toBeInTheDocument()
    expect(mocks.createIdbPersister).not.toHaveBeenCalled()
  })

  it('syncs both local hint keys to the authenticated user after a launch boot resolves', async () => {
    mocks.cacheScopeHint = 'stale-user'
    mocks.pathname = '/launch'
    window.localStorage.setItem('plateiq-query-cache:last-user', 'stale-user')
    window.localStorage.setItem('plateiq-offline-workout:last-user', 'stale-user')
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-b',
          },
        },
      },
      error: null,
    })

    render(
      <Providers>
        <div>child content</div>
      </Providers>,
    )

    await waitFor(() => {
      expect(window.localStorage.getItem('plateiq-query-cache:last-user')).toBe('user-b')
    })

    expect(window.localStorage.getItem('plateiq-offline-workout:last-user')).toBe('user-b')
  })

  it('preserves cached user hints during offline-capable boot while reachability is not yet confirmed online', async () => {
    mocks.cacheScopeHint = 'user-123'
    mocks.pathname = '/launch'
    mocks.probeSameOriginNetworkReachability.mockResolvedValue('unknown')
    mocks.getSession.mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    })
    window.localStorage.setItem('plateiq-query-cache:last-user', 'user-123')
    window.localStorage.setItem('plateiq-offline-workout:last-user', 'user-123')

    render(
      <Providers>
        <div>child content</div>
      </Providers>,
    )

    await waitFor(() => {
      expect(mocks.probeSameOriginNetworkReachability).toHaveBeenCalledTimes(1)
    })

    expect(window.localStorage.getItem('plateiq-query-cache:last-user')).toBe('user-123')
    expect(window.localStorage.getItem('plateiq-offline-workout:last-user')).toBe('user-123')
  })

  it('clears cached user hints on launch once the device is confirmed online and signed out', async () => {
    mocks.cacheScopeHint = 'user-123'
    mocks.pathname = '/launch'
    mocks.probeSameOriginNetworkReachability.mockResolvedValue('reachable')
    mocks.getSession.mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    })
    window.localStorage.setItem('plateiq-query-cache:last-user', 'user-123')
    window.localStorage.setItem('plateiq-offline-workout:last-user', 'user-123')

    render(
      <Providers>
        <div>child content</div>
      </Providers>,
    )

    await waitFor(() => {
      expect(window.localStorage.getItem('plateiq-query-cache:last-user')).toBeNull()
    })

    expect(window.localStorage.getItem('plateiq-offline-workout:last-user')).toBeNull()
  })

  it('falls back to the plain query provider when no cached auth scope hint exists', () => {
    render(
      <Providers>
        <div>child content</div>
      </Providers>,
    )

    expect(screen.getByTestId('query-provider')).toBeInTheDocument()
    expect(screen.queryByTestId('persist-provider')).not.toBeInTheDocument()
  })

  it('syncs the saved theme preference into a cookie for server-side launch rendering', () => {
    render(
      <Providers>
        <div>child content</div>
      </Providers>,
    )

    expect(document.cookie).toContain('plateiq-theme=dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('clears stale hinted query and offline state when auth resolves to a different user on first boot', async () => {
    mocks.cacheScopeHint = 'user-a'
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-b',
          },
        },
      },
      error: null,
    })

    render(
      <Providers>
        <div>child content</div>
      </Providers>,
    )

    await waitFor(() => {
      expect(mocks.clearPersistedQueryCache).toHaveBeenCalledWith('user-a')
    })

    await waitFor(() => {
      expect(mocks.clearOfflineWorkoutState).toHaveBeenCalledWith('user-a')
    })
  })
})
