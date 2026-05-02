import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutePrefetcher } from './AppRoutePrefetcher'

const mocks = vi.hoisted(() => ({
  pathname: '/dashboard',
  prefetch: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({
    prefetch: mocks.prefetch,
  }),
}))

describe('AppRoutePrefetcher', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.pathname = '/dashboard'
    mocks.prefetch.mockClear()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('warms inactive app tab routes after the critical render path', () => {
    render(<AppRoutePrefetcher />)

    expect(mocks.prefetch).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(900)
      vi.advanceTimersByTime(1)
    })

    expect(mocks.prefetch).toHaveBeenCalledWith('/analytics')

    act(() => {
      vi.advanceTimersByTime(450 * 3)
    })

    expect(mocks.prefetch).toHaveBeenCalledWith('/workouts')
    expect(mocks.prefetch).toHaveBeenCalledWith('/programs')
    expect(mocks.prefetch).toHaveBeenCalledWith('/settings')
    expect(mocks.prefetch).not.toHaveBeenCalledWith('/dashboard')
  })
})
