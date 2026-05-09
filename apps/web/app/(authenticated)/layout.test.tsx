import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppLayout from './layout'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
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

describe('authenticated AppLayout', () => {
  beforeEach(() => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
        },
      },
    })
    mocks.redirect.mockClear()
  })

  it('marks the authenticated shell and main scroll region for mobile elastic scrolling', async () => {
    const { container } = render(await AppLayout({ children: <section>Dashboard children</section> }))

    const shell = container.querySelector('[data-authenticated-shell="true"]')
    expect(shell).toHaveClass('authenticated-app-shell')

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('data-app-scroll-region', 'true')
    expect(main).toHaveClass('authenticated-app-scroll')
    expect(main).toHaveClass('app-shell')
    expect(main).toHaveClass('pb-safe-content')
    expect(screen.getByText('Mock header')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'App tabs' })).toBeInTheDocument()
    expect(screen.getByText('Dashboard children')).toBeInTheDocument()
  })
})
