import type { HTMLAttributes, ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NotFound from './not-found'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode } & HTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  }),
}))

vi.mock('@/components/layout/Header', () => ({
  Header: () => <header>Mock header</header>,
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
    expect(screen.getByRole('main')).toHaveAttribute('data-app-scroll-region', 'true')
    expect(screen.getByRole('main')).toHaveClass('authenticated-app-scroll')
    expect(screen.getByText('Mock header')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'App tabs' })).toBeInTheDocument()
    expect(screen.getByTestId('route-prefetcher')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Programs' })).toHaveAttribute('href', '/programs')
  })

  it('keeps the public fallback path unchanged for signed-out users', async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: null,
      },
    })

    const { container } = render(await NotFound())

    expect(container.querySelector('[data-authenticated-shell="true"]')).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'App tabs' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue to PlateIQ' })).toHaveAttribute('href', '/continue')
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/')
  })
})