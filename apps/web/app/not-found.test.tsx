import type { HTMLAttributes, ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NotFound from './not-found'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  prefetch: vi.fn(),
  push: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`)
  }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, prefetch: _prefetch, ...props }: { href: string; children: ReactNode; prefetch?: boolean } & HTMLAttributes<HTMLAnchorElement>) => {
    void _prefetch

    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
}))

vi.mock('next/navigation', () => ({
  redirect: (path: string) => mocks.redirect(path),
  usePathname: () => '/dashboard',
  useRouter: () => ({
    prefetch: mocks.prefetch,
    push: mocks.push,
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  }),
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

vi.mock('@/components/ui/button', () => ({
  buttonVariants: () => 'button',
}))

vi.mock('@/components/ui/empty', () => ({
  Empty: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  EmptyContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  EmptyDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  EmptyHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  EmptyMedia: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  EmptyTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}))

describe('root NotFound route', () => {
  beforeEach(() => {
    mocks.getUser.mockReset()
    mocks.prefetch.mockClear()
    mocks.push.mockClear()
    mocks.redirect.mockClear()
  })

  it('reuses the authenticated shell contract for signed-in users', async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
        },
      },
    })

    const { container } = render(await NotFound())

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
    expect(main).not.toContainElement(banner)

    const navigation = screen.getByRole('navigation', { name: 'App tabs' })
    expect(navigation).toBeInTheDocument()
    expect(scrollRegion).not.toContainElement(navigation)
    expect(screen.getByTestId('route-prefetcher')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Programs' })).toHaveAttribute('href', '/programs')
  })

  it('redirects signed-out users to continue for unknown routes', async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: null,
      },
    })

    await expect(NotFound()).rejects.toThrow('redirect:/continue')
  })
})
