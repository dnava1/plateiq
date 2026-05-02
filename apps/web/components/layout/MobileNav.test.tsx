import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    mocks.pathname = '/dashboard'
    mocks.prefetch.mockClear()
  })

  it('prefetches inactive tab routes on touch without refetching the active tab', () => {
    render(<MobileNav />)

    fireEvent.touchStart(screen.getByRole('link', { name: /Analytics/i }))
    expect(mocks.prefetch).toHaveBeenCalledWith('/analytics')

    fireEvent.touchStart(screen.getByRole('link', { name: /Dashboard/i }))
    expect(mocks.prefetch).not.toHaveBeenCalledWith('/dashboard')
  })
})
