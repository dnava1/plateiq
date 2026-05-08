import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MobileNav } from './MobileNav'

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

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe('MobileNav', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.pathname = '/dashboard'
    mocks.prefetch.mockClear()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('prefetches inactive tab routes on pointer down without refetching the active tab', () => {
    render(<MobileNav />)

    fireEvent.pointerDown(screen.getByRole('link', { name: /Analytics/i }))
    expect(mocks.prefetch).toHaveBeenCalledWith('/analytics')

    fireEvent.pointerDown(screen.getByRole('link', { name: /Dashboard/i }))
    expect(mocks.prefetch).not.toHaveBeenCalledWith('/dashboard')
  })

  it('marks the next route active immediately while navigation is pending', () => {
    render(<MobileNav />)

    const analyticsLink = screen.getByRole('link', { name: /Analytics/i })
    fireEvent.pointerDown(analyticsLink)

    expect(analyticsLink).toHaveAttribute('aria-current', 'page')
  })
})
