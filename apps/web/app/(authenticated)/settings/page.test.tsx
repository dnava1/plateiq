import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsPage from './page'

const mocks = vi.hoisted(() => ({
  clearAllPersistedQueryCaches: vi.fn().mockResolvedValue(undefined),
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
  isAnonymousUser: vi.fn().mockReturnValue(false),
  replace: vi.fn(),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  setPreferredUnit: vi.fn(),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  updateEq: vi.fn().mockResolvedValue({ error: null }),
  useProfile: vi.fn(),
  useUiStore: vi.fn(),
  useUser: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
}))

vi.mock('@/lib/auth/auth-state', () => ({
  isAnonymousUser: mocks.isAnonymousUser,
}))

vi.mock('@/hooks/useUser', () => ({
  useUser: () => mocks.useUser(),
}))

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => mocks.useProfile(),
}))

vi.mock('@/hooks/useSupabase', () => ({
  useSupabase: () => ({
    auth: { signOut: mocks.signOut },
    from: () => ({
      update: () => ({
        eq: mocks.updateEq,
      }),
    }),
    rpc: mocks.rpc,
  }),
}))

vi.mock('@/store/uiStore', () => ({
  useUiStore: () => mocks.useUiStore(),
}))

vi.mock('@/lib/query-persistence', () => ({
  clearAllPersistedQueryCaches: mocks.clearAllPersistedQueryCaches,
}))

vi.mock('@/components/layout/ThemeToggle', () => ({
  ThemeToggle: () => <div>theme-toggle</div>,
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  mocks.invalidateQueries.mockImplementation((options?: unknown) => queryClient.invalidateQueries(options as never))

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('SettingsPage', () => {
  beforeEach(() => {
    mocks.useUser.mockReturnValue({
      data: {
        email: 'athlete@plateiq.local',
        id: 'user-1',
        user_metadata: {},
      },
    })
    mocks.useProfile.mockReturnValue({
      data: {
        id: 'user-1',
        preferred_unit: 'lbs',
        weight_rounding_lbs: 5,
        strength_profile_age_years: 32,
        strength_profile_bodyweight_lbs: 181,
        strength_profile_sex: 'male',
      },
    })
    mocks.useUiStore.mockReturnValue({
      preferredUnit: 'lbs',
      setPreferredUnit: mocks.setPreferredUnit,
      setWeightRoundingLbs: vi.fn(),
      weightRoundingLbs: 5,
    })
    mocks.rpc.mockClear()
    mocks.signOut.mockClear()
    mocks.clearAllPersistedQueryCaches.mockClear()
    mocks.replace.mockClear()
    mocks.toastSuccess.mockClear()
    mocks.toastError.mockClear()
  })

  it('saves strength profile inputs through the update_strength_profile RPC', async () => {
    const user = userEvent.setup()

    render(<SettingsPage />, { wrapper: createWrapper() })

    expect(screen.getByLabelText('Age')).toHaveValue(32)
    expect(screen.getByLabelText('Bodyweight (lbs)')).toHaveValue(181)
    expect(screen.queryByRole('button', { name: 'Save Strength Profile' })).not.toBeInTheDocument()
    expect(screen.queryByText('Complete all three fields to unlock strength standards in Analytics.')).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText('Age'))
    await user.type(screen.getByLabelText('Age'), '34')
    await user.clear(screen.getByLabelText('Bodyweight (lbs)'))
    await user.type(screen.getByLabelText('Bodyweight (lbs)'), '185.5')

    await waitFor(() => {
      expect(mocks.rpc).toHaveBeenCalledWith('update_strength_profile', {
        p_age_years: 34,
        p_bodyweight_lbs: 185.5,
        p_sex: 'male',
      })
    })

    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })

  it('shows a single consolidated guest account card', () => {
    mocks.isAnonymousUser.mockReturnValue(true)
    mocks.useUser.mockReturnValue({
      data: {
        email: null,
        id: 'guest-user',
        user_metadata: {},
      },
    })

    render(<SettingsPage />, { wrapper: createWrapper() })

    expect(screen.getByText('This guest account is temporary and can be lost. Sign in with Google to keep your data.')).toBeInTheDocument()
  expect(screen.queryByText('This guest session is now a permanent account.')).not.toBeInTheDocument()
    expect(screen.queryByText('GA')).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Sign In with Google' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument()
    expect(screen.queryByText('Create your account')).not.toBeInTheDocument()
  })

  it('lets guests sign out and returns them to continue', async () => {
    const user = userEvent.setup()
    mocks.isAnonymousUser.mockReturnValue(true)
    mocks.useUser.mockReturnValue({
      data: {
        email: null,
        id: 'guest-user',
        user_metadata: {},
      },
    })

    render(<SettingsPage />, { wrapper: createWrapper() })

    await user.click(screen.getByRole('button', { name: 'Sign Out' }))

    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' })
    })

    expect(mocks.clearAllPersistedQueryCaches).toHaveBeenCalledOnce()
    expect(mocks.replace).toHaveBeenCalledWith('/continue')
  })
})