import type { AnchorHTMLAttributes } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppLayout from './layout'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  prefetch: vi.fn(),
  push: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`)
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: (path: string) => mocks.redirect(path),
  usePathname: () => '/dashboard',
  useRouter: () => ({
    prefetch: mocks.prefetch,
    push: mocks.push,
  }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, prefetch: _prefetch, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => {
    void _prefetch

    return <a href={href} {...props}>{children}</a>
  },
}))

vi.mock('@/components/brand/PlateIqMark', () => ({
  PlateIqMark: ({ className }: { className?: string }) => <span data-testid="plateiq-mark" className={className} />,
}))

vi.mock('@/hooks/useUser', () => ({
  useUser: () => ({
    data: undefined,
    isLoading: true,
  }),
}))

vi.mock('@/components/layout/MobileNav', () => ({
  MobileNav: () => <nav aria-label="App tabs">Mock tabs</nav>,
}))

vi.mock('@/components/layout/PreferenceSync', () => ({
  PreferenceSync: () => <div data-testid="preference-sync" />,
}))

vi.mock('@/components/layout/AppRoutePrefetcher', () => ({
  AppRoutePrefetcher: () => <div data-testid="route-prefetcher" />,
}))

describe('authenticated AppLayout', () => {
  beforeEach(() => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
        },
      },
    })
    mocks.prefetch.mockClear()
    mocks.push.mockClear()
    mocks.redirect.mockClear()
  })

  it('marks the authenticated shell and main scroll region for mobile elastic scrolling', async () => {
    const { container } = render(await AppLayout({ children: <section>Dashboard children</section> }))

    const shell = container.querySelector('[data-authenticated-shell="true"]')
    expect(shell).toHaveClass('authenticated-app-shell')

    const scrollRegion = container.querySelector('[data-app-scroll-region="true"]')
    expect(scrollRegion).toHaveClass('authenticated-app-scroll')
    expect(scrollRegion).toHaveClass('pb-safe-content')

    const main = screen.getByRole('main')
    expect(main).toHaveClass('app-shell')
    const banner = screen.getByRole('banner')
    expect(banner).toHaveAttribute('data-app-chrome', 'header')
    const headerSlot = container.querySelector('[data-app-header-slot="true"]')
    expect(headerSlot).toContainElement(banner)
    expect(scrollRegion).not.toContainElement(banner)
    expect(main).toContainElement(screen.getByText('Dashboard children'))
    expect(main).not.toContainElement(banner)

    const navigation = screen.getByRole('navigation', { name: 'App tabs' })
    expect(navigation).toBeInTheDocument()
    expect(scrollRegion).not.toContainElement(navigation)
  })
})
