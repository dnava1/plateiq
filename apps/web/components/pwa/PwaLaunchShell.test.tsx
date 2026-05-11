import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PwaLaunchShell } from './PwaLaunchShell'

const mocks = vi.hoisted(() => ({
  getActiveWorkoutSnapshot: vi.fn(),
  getOfflineWorkoutPack: vi.fn(),
  getPersistedQueryCacheMetadata: vi.fn(),
  probeSameOriginNetworkReachability: vi.fn(),
  getSessionUserIdWithTimeout: vi.fn(),
  getStoredAuthScopeHint: vi.fn(),
  replace: vi.fn(),
  router: {
    replace: vi.fn(),
  },
  searchParams: new URLSearchParams(),
  shellState: {
    isWarmDataReady: true,
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => mocks.searchParams,
}))

vi.mock('@/components/layout/AppShellClientState', () => ({
  useAppShellClientState: () => mocks.shellState,
}))

vi.mock('@/lib/auth/session-user', () => ({
  getSessionUserIdWithTimeout: () => mocks.getSessionUserIdWithTimeout(),
  getStoredAuthScopeHint: () => mocks.getStoredAuthScopeHint(),
  probeSameOriginNetworkReachability: () => mocks.probeSameOriginNetworkReachability(),
}))

vi.mock('@/lib/offline-workout-store', () => ({
  getActiveWorkoutSnapshot: () => mocks.getActiveWorkoutSnapshot(),
  getOfflineWorkoutPack: () => mocks.getOfflineWorkoutPack(),
}))

vi.mock('@/lib/query-persistence', async () => {
  const actual = await vi.importActual<typeof import('@/lib/query-persistence')>('@/lib/query-persistence')
  return {
    ...actual,
    getPersistedQueryCacheMetadata: () => mocks.getPersistedQueryCacheMetadata(),
  }
})

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: online,
  })
}

describe('PwaLaunchShell', () => {
  beforeEach(() => {
    mocks.getActiveWorkoutSnapshot.mockReset()
    mocks.getOfflineWorkoutPack.mockReset()
    mocks.getPersistedQueryCacheMetadata.mockReset()
    mocks.probeSameOriginNetworkReachability.mockReset()
    mocks.getSessionUserIdWithTimeout.mockReset()
    mocks.getStoredAuthScopeHint.mockReset()
    mocks.replace.mockReset()
    mocks.router.replace = mocks.replace
    mocks.searchParams = new URLSearchParams()
    mocks.shellState = {
      isWarmDataReady: true,
    }
    mocks.probeSameOriginNetworkReachability.mockResolvedValue('reachable')
    setOnline(true)
    vi.useRealTimers()
    window.history.replaceState(null, '', '/launch')
    document.documentElement.removeAttribute('data-pwa-launch-slow')
  })

  it('uses the full-screen launch shell so the centered card and background fill the standalone viewport', () => {
    mocks.getSessionUserIdWithTimeout.mockReturnValue(new Promise(() => {}))

    const { container } = render(<PwaLaunchShell />)

    expect(container.firstElementChild).toHaveClass('pwa-launch-shell')
  })

  it('renders the launch spinner immediately so CSS can handle the delayed reveal', () => {
    mocks.getSessionUserIdWithTimeout.mockReturnValue(new Promise(() => {}))

    const { container } = render(<PwaLaunchShell />)
    const shell = container.firstElementChild

    expect(shell).toHaveAttribute('data-status', 'launching')
    expect(container.querySelector('.pwa-launch-spinner-slot')).toBeInTheDocument()
    expect(container.querySelector('.pwa-launch-spinner')).toBeInTheDocument()
  })

  it('clears the shared slow-launch spinner flag after leaving the launch screen', () => {
    mocks.getSessionUserIdWithTimeout.mockReturnValue(new Promise(() => {}))
    document.documentElement.setAttribute('data-pwa-launch-slow', 'true')

    const { unmount } = render(<PwaLaunchShell />)

    unmount()

    expect(document.documentElement).not.toHaveAttribute('data-pwa-launch-slow')
  })

  it('keeps the shared slow-launch spinner flag while the boot card is still fading', () => {
    mocks.getSessionUserIdWithTimeout.mockReturnValue(new Promise(() => {}))
    document.documentElement.setAttribute('data-pwa-boot', 'done')
    document.documentElement.setAttribute('data-pwa-launch-slow', 'true')

    const { unmount } = render(<PwaLaunchShell />)

    unmount()

    expect(document.documentElement).toHaveAttribute('data-pwa-launch-slow', 'true')
    document.documentElement.removeAttribute('data-pwa-boot')
    document.documentElement.removeAttribute('data-pwa-launch-slow')
  })

  it('waits for warm data restore before leaving the launch screen', async () => {
    mocks.shellState = {
      isWarmDataReady: false,
    }
    mocks.getSessionUserIdWithTimeout.mockResolvedValue('user-123')

    const { rerender } = render(<PwaLaunchShell />)

    await waitFor(() => {
      expect(screen.getByText('PlateIQ')).toBeInTheDocument()
    })

    expect(mocks.replace).not.toHaveBeenCalled()

    mocks.shellState = {
      isWarmDataReady: true,
    }
    rerender(<PwaLaunchShell />)

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('routes offline boots with a saved workout pack into gym mode even without a warm query snapshot', async () => {
    mocks.probeSameOriginNetworkReachability.mockResolvedValue('unreachable')
    mocks.searchParams = new URLSearchParams('next=%2Fdashboard')
    mocks.getStoredAuthScopeHint.mockReturnValue('user-123')
    mocks.getSessionUserIdWithTimeout.mockResolvedValue(null)
    mocks.getPersistedQueryCacheMetadata.mockResolvedValue(null)
    mocks.getActiveWorkoutSnapshot.mockResolvedValue(null)
    mocks.getOfflineWorkoutPack.mockResolvedValue({
      activeCycle: {
        cycleNumber: 1,
        id: 7,
      },
      program: {
        config: {},
        id: 11,
        name: 'Starter',
        template_key: 'starter',
      },
      savedAt: '2026-05-08T10:00:00.000Z',
      suggested: {
        dayIndex: 0,
        weekNumber: 1,
      },
      userId: 'user-123',
      version: 1,
      workouts: [],
    })

    render(<PwaLaunchShell />)

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/gym')
    })
  })

  it('falls back to gym mode when an unresolved launch is served directly on an authenticated route', async () => {
    mocks.probeSameOriginNetworkReachability.mockResolvedValue('unreachable')
    window.history.replaceState(null, '', '/workouts')
    mocks.getStoredAuthScopeHint.mockReturnValue('user-123')
    mocks.getSessionUserIdWithTimeout.mockResolvedValue(null)
    mocks.getPersistedQueryCacheMetadata.mockResolvedValue({
      schemaVersion: 4,
      stale: false,
      updatedAt: new Date().toISOString(),
      userId: 'user-123',
    })
    mocks.getActiveWorkoutSnapshot.mockResolvedValue(null)
    mocks.getOfflineWorkoutPack.mockResolvedValue({
      activeCycle: {
        cycleNumber: 1,
        id: 7,
      },
      program: {
        config: {},
        id: 11,
        name: 'Starter',
        template_key: 'starter',
      },
      savedAt: '2026-05-08T10:00:00.000Z',
      suggested: {
        dayIndex: 0,
        weekNumber: 1,
      },
      userId: 'user-123',
      version: 1,
      workouts: [],
    })

    render(<PwaLaunchShell />)

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/gym')
    })
  })

  it('routes online authenticated launches immediately and skips offline cache probing', async () => {
    mocks.getSessionUserIdWithTimeout.mockResolvedValue('user-123')
    render(<PwaLaunchShell />)

    await waitFor(() => {
      expect(screen.getByText('PlateIQ')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/dashboard')
    })

    expect(mocks.getPersistedQueryCacheMetadata).not.toHaveBeenCalled()
    expect(mocks.getActiveWorkoutSnapshot).not.toHaveBeenCalled()
    expect(mocks.getOfflineWorkoutPack).not.toHaveBeenCalled()
  })

  it('sends online launches without a session to continue', async () => {
    mocks.getSessionUserIdWithTimeout.mockResolvedValue(null)

    render(<PwaLaunchShell />)

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/continue')
    })
  })

  it('shows offline unavailable instead of continuing when the browser reports online but the network probe fails', async () => {
    setOnline(true)
    mocks.probeSameOriginNetworkReachability.mockResolvedValue('unreachable')
    mocks.searchParams = new URLSearchParams('next=%2Fdashboard')
    mocks.getStoredAuthScopeHint.mockReturnValue('user-123')
    mocks.getSessionUserIdWithTimeout.mockResolvedValue(null)
    mocks.getPersistedQueryCacheMetadata.mockResolvedValue({
      schemaVersion: 4,
      stale: true,
      updatedAt: '2026-05-01T08:00:00.000Z',
      userId: 'user-123',
    })
    mocks.getActiveWorkoutSnapshot.mockResolvedValue(null)
    mocks.getOfflineWorkoutPack.mockResolvedValue(null)

    render(<PwaLaunchShell />)

    await waitFor(() => {
      expect(screen.getByText('Offline access is not ready yet')).toBeInTheDocument()
    })

    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('keeps cached dashboard launches working when the browser reports online but the network probe fails', async () => {
    setOnline(true)
    mocks.probeSameOriginNetworkReachability.mockResolvedValue('unreachable')
    mocks.searchParams = new URLSearchParams('next=%2Fdashboard')
    mocks.getStoredAuthScopeHint.mockReturnValue('user-123')
    mocks.getSessionUserIdWithTimeout.mockResolvedValue(null)
    mocks.getPersistedQueryCacheMetadata.mockResolvedValue({
      schemaVersion: 4,
      stale: false,
      updatedAt: new Date().toISOString(),
      userId: 'user-123',
    })
    mocks.getActiveWorkoutSnapshot.mockResolvedValue(null)
    mocks.getOfflineWorkoutPack.mockResolvedValue(null)

    render(<PwaLaunchShell />)

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('does not trust the cached scope hint when the reachability probe is indeterminate', async () => {
    setOnline(true)
    mocks.probeSameOriginNetworkReachability.mockResolvedValue('unknown')
    mocks.searchParams = new URLSearchParams('next=%2Fdashboard')
    mocks.getStoredAuthScopeHint.mockReturnValue('user-123')
    mocks.getSessionUserIdWithTimeout.mockResolvedValue(null)

    render(<PwaLaunchShell />)

    await waitFor(() => {
      expect(screen.getByText('Offline access is not ready yet')).toBeInTheDocument()
    })

    expect(mocks.replace).not.toHaveBeenCalled()
  })
})
