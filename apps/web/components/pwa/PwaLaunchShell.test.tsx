import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PwaLaunchShell } from './PwaLaunchShell'

const mocks = vi.hoisted(() => ({
  getActiveWorkoutSnapshot: vi.fn(),
  getOfflineWorkoutPack: vi.fn(),
  getPersistedQueryCacheMetadata: vi.fn(),
  getSessionUserIdWithTimeout: vi.fn(),
  getStoredAuthScopeHint: vi.fn(),
  replace: vi.fn(),
  router: {
    replace: vi.fn(),
  },
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => mocks.searchParams,
}))

vi.mock('@/lib/auth/session-user', () => ({
  getSessionUserIdWithTimeout: () => mocks.getSessionUserIdWithTimeout(),
  getStoredAuthScopeHint: () => mocks.getStoredAuthScopeHint(),
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
    mocks.getSessionUserIdWithTimeout.mockReset()
    mocks.getStoredAuthScopeHint.mockReset()
    mocks.replace.mockReset()
    mocks.router.replace = mocks.replace
    mocks.searchParams = new URLSearchParams()
    setOnline(true)
  })

  it('routes offline boots with a saved workout pack into gym mode even without a warm query snapshot', async () => {
    setOnline(false)
    mocks.searchParams = new URLSearchParams('next=%2Fdashboard')
    mocks.getStoredAuthScopeHint.mockReturnValue('user-123')
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

  it('routes online authenticated launches immediately and skips offline cache probing', async () => {
    mocks.getSessionUserIdWithTimeout.mockResolvedValue('user-123')
    render(<PwaLaunchShell />)

    await waitFor(() => {
      expect(screen.getByText('Opening PlateIQ')).toBeInTheDocument()
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

  it('shows the offline unavailable state when the cached query shell is too old and no workout state exists', async () => {
    setOnline(false)
    mocks.searchParams = new URLSearchParams('next=%2Fdashboard')
    mocks.getStoredAuthScopeHint.mockReturnValue('user-123')
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
})