import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShellClientStateProvider } from '@/components/layout/AppShellClientState'
import type { AppNavHref } from '@/components/layout/navigation'
import { MobileNav } from './MobileNav'

const mocks = vi.hoisted(() => ({
  pathname: '/dashboard',
  prefetch: vi.fn(),
  push: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({
    prefetch: mocks.prefetch,
    push: mocks.push,
  }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

function TestHarness() {
  const [pendingNavHref, setPendingNavHref] = useState<AppNavHref | null>(null)

  return (
    <AppShellClientStateProvider
      value={{
        authScope: null,
        cacheScope: null,
        isAuthReady: true,
        isWarmDataReady: true,
        pendingNavHref,
        setPendingNavHref,
      }}
    >
      <MobileNav />
    </AppShellClientStateProvider>
  )
}

describe('MobileNav', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.pathname = '/dashboard'
    mocks.prefetch.mockClear()
    mocks.push.mockClear()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('prefetches inactive tab routes on pointer down without refetching the active tab', () => {
    render(<TestHarness />)

    fireEvent.pointerDown(screen.getByRole('link', { name: /Analytics/i }))
    expect(mocks.prefetch).toHaveBeenCalledWith('/analytics')

    fireEvent.pointerDown(screen.getByRole('link', { name: /Dashboard/i }))
    expect(mocks.prefetch).not.toHaveBeenCalledWith('/dashboard')
  })

  it('marks the next route active immediately while navigation is pending', () => {
    render(<TestHarness />)

    const analyticsLink = screen.getByRole('link', { name: /Analytics/i })
    fireEvent.pointerDown(analyticsLink)

    expect(analyticsLink).toHaveAttribute('aria-current', 'page')
  })

  it('keeps the latest pending destination active across an interrupted route commit', () => {
    const { rerender } = render(<TestHarness />)

    fireEvent.pointerDown(screen.getByRole('link', { name: /Analytics/i }), {
      button: 0,
      pointerType: 'touch',
    })
    fireEvent.pointerDown(screen.getByRole('link', { name: /Workouts/i }), {
      button: 0,
      pointerType: 'touch',
    })

    expect(mocks.push).toHaveBeenNthCalledWith(1, '/analytics')
    expect(mocks.push).toHaveBeenNthCalledWith(2, '/workouts')
    expect(screen.getByRole('link', { name: /Workouts/i })).toHaveAttribute('aria-current', 'page')

    mocks.pathname = '/analytics'
    rerender(<TestHarness />)

    expect(screen.getByRole('link', { name: /Workouts/i })).toHaveAttribute('aria-current', 'page')

    mocks.pathname = '/workouts'
    rerender(<TestHarness />)

    expect(screen.getByRole('link', { name: /Workouts/i })).toHaveAttribute('aria-current', 'page')
  })
})
