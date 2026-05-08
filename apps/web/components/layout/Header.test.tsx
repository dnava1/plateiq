import { render, screen, within } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import type { AnchorHTMLAttributes } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShellClientStateProvider } from '@/components/layout/AppShellClientState'
import { Header } from './Header'

const mocks = vi.hoisted(() => ({
  pathname: '/dashboard',
  prefetch: vi.fn(),
  push: vi.fn(),
  userResult: {
    data: undefined as User | null | undefined,
    isLoading: true,
  },
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({
    prefetch: mocks.prefetch,
    push: mocks.push,
  }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('@/components/brand/PlateIqMark', () => ({
  PlateIqMark: ({ className }: { className?: string }) => <span data-testid="plateiq-mark" className={className} />,
}))

vi.mock('@/hooks/useUser', () => ({
  useUser: () => mocks.userResult,
}))

function renderHeader() {
  return render(
    <AppShellClientStateProvider
      value={{
        authScope: null,
        cacheScope: null,
        isAuthReady: false,
        isWarmDataReady: false,
        pendingNavHref: null,
        setPendingNavHref: () => undefined,
      }}
    >
      <Header />
    </AppShellClientStateProvider>,
  )
}

function createUser(overrides: Partial<User> = {}): User {
  return {
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-05-08T00:00:00.000Z',
    email: 'dan@plateiq.local',
    id: 'user-1',
    is_anonymous: false,
    user_metadata: {},
    ...overrides,
  } as User
}

describe('Header', () => {
  beforeEach(() => {
    mocks.pathname = '/dashboard'
    mocks.prefetch.mockClear()
    mocks.push.mockClear()
    mocks.userResult = {
      data: undefined,
      isLoading: true,
    }
  })

  it('does not show fallback identity copy while the user query is loading', () => {
    renderHeader()

    const settingsLink = screen.getByLabelText('Open settings')

    expect(within(settingsLink).queryByText('Athlete')).not.toBeInTheDocument()
    expect(within(settingsLink).queryByText('A')).not.toBeInTheDocument()
    expect(within(settingsLink).queryByText('Signed in')).not.toBeInTheDocument()
    expect(settingsLink.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3)
  })

  it('does not flash fallback identity copy when the query has no user object yet', () => {
    mocks.userResult = {
      data: null,
      isLoading: false,
    }

    renderHeader()

    const settingsLink = screen.getByLabelText('Open settings')

    expect(within(settingsLink).queryByText('Athlete')).not.toBeInTheDocument()
    expect(within(settingsLink).queryByText('A')).not.toBeInTheDocument()
    expect(within(settingsLink).queryByText('Signed in')).not.toBeInTheDocument()
    expect(settingsLink.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3)
  })

  it('keeps avatar initials hidden while the profile image is loading', () => {
    mocks.userResult = {
      data: createUser({
        user_metadata: {
          avatar_url: 'https://example.com/dan-avatar.png',
          full_name: 'Dan Navarro',
        },
      }),
      isLoading: false,
    }

    renderHeader()

    const settingsLink = screen.getByLabelText('Open settings')

    expect(within(settingsLink).getByText('Dan Navarro')).toBeInTheDocument()
    expect(within(settingsLink).queryByText('D')).not.toBeInTheDocument()
    expect(settingsLink.querySelector('[data-slot="avatar-fallback"]')).not.toBeInTheDocument()
    expect(settingsLink.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(1)
  })
})
