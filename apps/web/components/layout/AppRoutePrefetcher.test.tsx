import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutePrefetcher } from './AppRoutePrefetcher'

const mocks = vi.hoisted(() => ({
  appShellState: {
    isAuthReady: true,
    isWarmDataReady: true,
  },
  pathname: '/dashboard',
  prefetch: vi.fn(),
}))

vi.mock('@/components/layout/AppShellClientState', () => ({
  useAppShellClientState: () => mocks.appShellState,
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({
    prefetch: mocks.prefetch,
  }),
}))

function setStandaloneMode(standalone: boolean) {
  Object.defineProperty(window.navigator, 'standalone', {
    configurable: true,
    value: standalone,
  })

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      addEventListener: vi.fn(),
      matches: standalone,
      media: '(display-mode: standalone)',
      removeEventListener: vi.fn(),
    })),
  })
}

describe('AppRoutePrefetcher', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.appShellState = {
      isAuthReady: true,
      isWarmDataReady: true,
    }
    mocks.pathname = '/dashboard'
    mocks.prefetch.mockClear()
    setStandaloneMode(false)
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('warms inactive app tab routes after the critical render path', () => {
    render(<AppRoutePrefetcher />)

    expect(mocks.prefetch).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(60)
    })

    expect(mocks.prefetch).toHaveBeenCalledWith('/workouts')

    act(() => {
      vi.advanceTimersByTime(110 * 3)
    })

    expect(mocks.prefetch).toHaveBeenCalledWith('/analytics')
    expect(mocks.prefetch).toHaveBeenCalledWith('/programs')
    expect(mocks.prefetch).toHaveBeenCalledWith('/settings')
    expect(mocks.prefetch).not.toHaveBeenCalledWith('/dashboard')
  })

  it('delays standalone route prefetching until after the launch settles', () => {
    setStandaloneMode(true)

    render(<AppRoutePrefetcher />)

    act(() => {
      vi.advanceTimersByTime(1199)
    })

    expect(mocks.prefetch).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(mocks.prefetch).toHaveBeenCalledWith('/workouts')

    act(() => {
      vi.advanceTimersByTime(250 * 3)
    })

    expect(mocks.prefetch).toHaveBeenCalledWith('/analytics')
    expect(mocks.prefetch).toHaveBeenCalledWith('/programs')
    expect(mocks.prefetch).toHaveBeenCalledWith('/settings')
  })

  it('waits until auth and warm data restore are ready before prefetching routes', () => {
    mocks.appShellState = {
      isAuthReady: false,
      isWarmDataReady: false,
    }

    render(<AppRoutePrefetcher />)

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mocks.prefetch).not.toHaveBeenCalled()
  })
})
