import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PreferenceSync } from '@/components/layout/PreferenceSync'
import type { ProfilePreferences } from '@/hooks/useProfile'
import SettingsPage from './page'

const mocks = vi.hoisted(() => ({
  clearAllPersistedQueryCaches: vi.fn().mockResolvedValue(undefined),
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
  isAnonymousUser: vi.fn().mockReturnValue(false),
  replace: vi.fn(),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  setPreferredUnit: vi.fn(),
  setWeightRoundingLbs: vi.fn(),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  updateProfile: vi.fn(),
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
  profilePreferenceMutationKeys: {
    all: () => ['profile', 'preferences'],
    rounding: () => ['profile', 'preferences', 'rounding'],
    unit: () => ['profile', 'preferences', 'unit'],
  },
  useProfile: () => mocks.useProfile(),
}))

vi.mock('@/hooks/useSupabase', () => ({
  useSupabase: () => ({
    auth: { signOut: mocks.signOut },
    from: () => ({
      update: mocks.updateProfile,
    }),
    rpc: mocks.rpc,
  }),
}))

vi.mock('@/store/uiStore', () => ({
  useUiStore: (selector?: (state: ReturnType<typeof mocks.useUiStore>) => unknown) => {
    const state = mocks.useUiStore()
    return typeof selector === 'function' ? selector(state) : state
  },
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
      isLoading: false,
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
      isLoading: false,
    })
    mocks.useUiStore.mockReturnValue({
      preferredUnit: 'lbs',
      setPreferredUnit: mocks.setPreferredUnit,
      setWeightRoundingLbs: mocks.setWeightRoundingLbs,
      weightRoundingLbs: 5,
    })
    mocks.setPreferredUnit.mockClear()
    mocks.setWeightRoundingLbs.mockClear()
    mocks.updateProfile.mockImplementation(() => ({
      eq: mocks.updateEq,
    }))
    mocks.updateProfile.mockClear()
    mocks.updateEq.mockClear()
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

  it('hydrates the saved strength profile values after the profile query resolves on refresh even if a second render happens before the sync frame', async () => {
    const profileState: {
      data: ProfilePreferences | null | undefined
      isLoading: boolean
    } = {
      data: undefined,
      isLoading: true,
    }
    const animationFrameCallbacks: Array<FrameRequestCallback | null> = []

    const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      animationFrameCallbacks.push(callback)
      return animationFrameCallbacks.length
    })
    const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
      animationFrameCallbacks[id - 1] = null
    })

    mocks.useProfile.mockImplementation(() => profileState)

    const view = render(<SettingsPage />, { wrapper: createWrapper() })

    expect(screen.getByLabelText('Age')).toHaveValue(null)
    expect(screen.getByLabelText('Bodyweight (lbs)')).toHaveValue(null)

    profileState.data = {
      id: 'user-1',
      preferred_unit: 'lbs',
      weight_rounding_lbs: 5,
      strength_profile_age_years: 32,
      strength_profile_bodyweight_lbs: 181,
      strength_profile_sex: 'male',
    }
    profileState.isLoading = false

    view.rerender(<SettingsPage />)
    view.rerender(<SettingsPage />)

    await new Promise((resolve) => setTimeout(resolve, 350))

    expect(mocks.rpc).not.toHaveBeenCalledWith('update_strength_profile', {
      p_age_years: null,
      p_bodyweight_lbs: null,
      p_sex: null,
    })

    await act(async () => {
      for (const callback of animationFrameCallbacks) {
        callback?.(performance.now())
      }
    })

    try {
      await waitFor(() => {
        expect(screen.getByLabelText('Age')).toHaveValue(32)
        expect(screen.getByLabelText('Bodyweight (lbs)')).toHaveValue(181)
        expect(screen.getByRole('combobox', { name: 'Sex' })).toHaveTextContent('male')
      })
    } finally {
      requestAnimationFrameSpy.mockRestore()
      cancelAnimationFrameSpy.mockRestore()
    }
  })

  it('does not overwrite an in-progress strength profile edit when the server snapshot refetches', async () => {
    const user = userEvent.setup()
    const profileState: {
      data: ProfilePreferences | null | undefined
      isLoading: boolean
    } = {
      data: {
        id: 'user-1',
        preferred_unit: 'lbs',
        weight_rounding_lbs: 5,
        strength_profile_age_years: 32,
        strength_profile_bodyweight_lbs: 181,
        strength_profile_sex: 'male',
      },
      isLoading: false,
    }

    mocks.useProfile.mockImplementation(() => profileState)

    const view = render(<SettingsPage />, { wrapper: createWrapper() })

    await user.clear(screen.getByLabelText('Age'))
    await user.type(screen.getByLabelText('Age'), '34')

    await waitFor(() => {
      expect(mocks.rpc).toHaveBeenCalledWith('update_strength_profile', {
        p_age_years: 34,
        p_bodyweight_lbs: 181,
        p_sex: 'male',
      })
    })

    await user.clear(screen.getByLabelText('Bodyweight (lbs)'))
    await user.type(screen.getByLabelText('Bodyweight (lbs)'), '18')

    profileState.data = {
      id: 'user-1',
      preferred_unit: 'lbs',
      weight_rounding_lbs: 5,
      strength_profile_age_years: 34,
      strength_profile_bodyweight_lbs: 181,
      strength_profile_sex: 'male',
    }

    view.rerender(<SettingsPage />)

    await new Promise((resolve) => setTimeout(resolve, 25))

    expect(screen.getByLabelText('Age')).toHaveValue(34)
    expect(screen.getByLabelText('Bodyweight (lbs)')).toHaveValue(18)
  })

  it('keeps the unit controls disabled until auth and profile hydration complete', () => {
    mocks.useUser.mockReturnValue({
      data: undefined,
      isLoading: true,
    })
    mocks.useProfile.mockReturnValue({
      data: undefined,
      isLoading: true,
    })

    render(<SettingsPage />, { wrapper: createWrapper() })

    expect(screen.getByRole('radio', { name: 'Pounds (lbs)' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'Kilograms (kg)' })).toBeDisabled()
  })

  it('does not let PreferenceSync overwrite the optimistic unit while a preference mutation is pending', async () => {
    const user = userEvent.setup()
    let resolveUpdate: ((value: { error: null }) => void) | undefined

    mocks.useProfile.mockReturnValue({
      data: {
        id: 'user-1',
        preferred_unit: 'kg',
        weight_rounding_lbs: 11.02312,
        strength_profile_age_years: 32,
        strength_profile_bodyweight_lbs: 181,
        strength_profile_sex: 'male',
      },
      isLoading: false,
    })
    mocks.useUiStore.mockReturnValue({
      preferredUnit: 'kg',
      setPreferredUnit: mocks.setPreferredUnit,
      setWeightRoundingLbs: mocks.setWeightRoundingLbs,
      weightRoundingLbs: 11.02312,
    })
    mocks.updateEq.mockReturnValueOnce(new Promise((resolve) => {
      resolveUpdate = resolve
    }))

    render(
      <>
        <PreferenceSync />
        <SettingsPage />
      </>,
      { wrapper: createWrapper() },
    )

    mocks.setPreferredUnit.mockClear()

    await user.click(screen.getByRole('radio', { name: 'Pounds (lbs)' }))

    await waitFor(() => {
      expect(mocks.setPreferredUnit).toHaveBeenCalledWith('lbs')
    })

    expect(mocks.setPreferredUnit).not.toHaveBeenCalledWith('kg')

    resolveUpdate?.({ error: null })
  })

  it('persists only the preferred unit when switching from kilograms', async () => {
    const user = userEvent.setup()

    mocks.useProfile.mockReturnValue({
      data: {
        id: 'user-1',
        preferred_unit: 'kg',
        weight_rounding_lbs: 11.02312,
        strength_profile_age_years: 32,
        strength_profile_bodyweight_lbs: 181,
        strength_profile_sex: 'male',
      },
      isLoading: false,
    })
    mocks.useUiStore.mockReturnValue({
      preferredUnit: 'kg',
      setPreferredUnit: mocks.setPreferredUnit,
      setWeightRoundingLbs: mocks.setWeightRoundingLbs,
      weightRoundingLbs: 11.02312,
    })

    render(<SettingsPage />, { wrapper: createWrapper() })

    await user.click(screen.getByRole('radio', { name: 'Pounds (lbs)' }))

    expect(mocks.setPreferredUnit).toHaveBeenCalledWith('lbs')

    await waitFor(() => {
      expect(mocks.updateProfile).toHaveBeenCalledWith({
        preferred_unit: 'lbs',
      })
    })

    expect(mocks.updateEq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('persists only the preferred unit when switching from pounds', async () => {
    const user = userEvent.setup()

    render(<SettingsPage />, { wrapper: createWrapper() })

    await user.click(screen.getByRole('radio', { name: 'Kilograms (kg)' }))

    expect(mocks.setPreferredUnit).toHaveBeenCalledWith('kg')

    await waitFor(() => {
      expect(mocks.updateProfile).toHaveBeenCalledWith({
        preferred_unit: 'kg',
      })
    })
  })

  it('rolls back the unit when the unit update fails', async () => {
    const user = userEvent.setup()
    mocks.useProfile.mockReturnValue({
      data: {
        id: 'user-1',
        preferred_unit: 'kg',
        weight_rounding_lbs: 11.02312,
        strength_profile_age_years: 32,
        strength_profile_bodyweight_lbs: 181,
        strength_profile_sex: 'male',
      },
      isLoading: false,
    })
    mocks.useUiStore.mockReturnValue({
      preferredUnit: 'kg',
      setPreferredUnit: mocks.setPreferredUnit,
      setWeightRoundingLbs: mocks.setWeightRoundingLbs,
      weightRoundingLbs: 11.02312,
    })
    mocks.updateEq.mockResolvedValueOnce({ error: new Error('network failed') })

    render(<SettingsPage />, { wrapper: createWrapper() })

    await user.click(screen.getByRole('radio', { name: 'Pounds (lbs)' }))

    await waitFor(() => {
      expect(mocks.setPreferredUnit).toHaveBeenNthCalledWith(1, 'lbs')
      expect(mocks.setPreferredUnit).toHaveBeenNthCalledWith(2, 'kg')
    })

    expect(mocks.toastError).toHaveBeenCalledWith('network failed')
  })

  it('does not render a weight rounding control', () => {
    render(<SettingsPage />, { wrapper: createWrapper() })

    expect(screen.queryByText('Weight Rounding')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /rounding increment/i })).not.toBeInTheDocument()
    expect(screen.getByText(/Loads round down to 5 lbs or 2.5 kg automatically./i)).toBeInTheDocument()
  })

  it('shows a clear empty state when sex is not set', () => {
    mocks.useProfile.mockReturnValue({
      data: {
        id: 'user-1',
        preferred_unit: 'lbs',
        weight_rounding_lbs: 5,
        strength_profile_age_years: 32,
        strength_profile_bodyweight_lbs: 181,
        strength_profile_sex: null,
      },
    })

    render(<SettingsPage />, { wrapper: createWrapper() })

    expect(screen.getByText('Sex')).toBeInTheDocument()
    expect(within(screen.getByRole('combobox', { name: 'Sex' })).getByText('Not set')).toBeInTheDocument()
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