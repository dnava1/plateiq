'use client'

import Link from 'next/link'
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LogOut, Ruler } from 'lucide-react'
import { toast } from 'sonner'
import { isAnonymousUser } from '@/lib/auth/auth-state'
import { profilePreferenceMutationKeys, useProfile } from '@/hooks/useProfile'
import { useUser } from '@/hooks/useUser'
import { useSupabase } from '@/hooks/useSupabase'
import { analyticsQueryKeys } from '@/hooks/useAnalytics'
import { useUiStore } from '@/store/uiStore'
import { clearAllPersistedQueryCaches } from '@/lib/query-persistence'
import { DEFAULT_WEIGHT_ROUNDING_LBS, displayToLbs, getRoundingOptions, lbsToDisplay, parseWeightRoundingLbs, snapWeightRoundingLbsToUnit } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import type { PreferredUnit, StrengthProfileSex, WeightRoundingLbs } from '@/types/domain'
import type { ProfilePreferences } from '@/hooks/useProfile'

function subscribeToClientRender(onStoreChange: () => void) {
  const animationFrameId = window.requestAnimationFrame(onStoreChange)

  return () => {
    window.cancelAnimationFrame(animationFrameId)
  }
}

function formatStrengthProfileWeight(valueLbs: number | null, unit: PreferredUnit) {
  if (valueLbs === null || !Number.isFinite(valueLbs)) {
    return ''
  }

  return String(lbsToDisplay(valueLbs, unit))
}

type StrengthProfileSnapshot = {
  strength_profile_age_years: number | null
  strength_profile_bodyweight_lbs: number | null
  strength_profile_sex: StrengthProfileSex | null
} | null | undefined

type StrengthProfileDraft = {
  ageYears: string
  bodyweight: string
  sex: '' | StrengthProfileSex
}

type StrengthProfileValues = {
  ageYears: number | null
  bodyweightLbs: number | null
  sex: StrengthProfileSex | null
}

type StrengthProfileErrors = {
  ageYears?: string
  bodyweight?: string
}

type StrengthProfileErrorField = keyof StrengthProfileErrors

const STRENGTH_PROFILE_ERROR_DELAY_MS = 1000

function createStrengthProfileDraft(profile: StrengthProfileSnapshot, preferredUnit: PreferredUnit): StrengthProfileDraft {
  return {
    ageYears: profile?.strength_profile_age_years !== null && profile?.strength_profile_age_years !== undefined
      ? String(profile.strength_profile_age_years)
      : '',
    bodyweight: formatStrengthProfileWeight(profile?.strength_profile_bodyweight_lbs ?? null, preferredUnit),
    sex: profile?.strength_profile_sex ?? '',
  }
}

function createStrengthProfileValues(profile: StrengthProfileSnapshot): StrengthProfileValues {
  return {
    ageYears: profile?.strength_profile_age_years ?? null,
    bodyweightLbs: profile?.strength_profile_bodyweight_lbs ?? null,
    sex: profile?.strength_profile_sex ?? null,
  }
}

function createStrengthProfileValuesKey(values: StrengthProfileValues) {
  return [
    values.sex ?? 'none',
    values.ageYears ?? 'none',
    values.bodyweightLbs ?? 'none',
  ].join(':')
}

function parseStrengthProfileDraft(draft: StrengthProfileDraft, preferredUnit: PreferredUnit) {
  const normalizedAgeInput = draft.ageYears.trim()
  const normalizedBodyweightInput = draft.bodyweight.trim()
  const sex = draft.sex === 'male' || draft.sex === 'female' ? draft.sex : null
  const ageYears = normalizedAgeInput.length === 0 ? null : Number(normalizedAgeInput)
  const parsedBodyweight = normalizedBodyweightInput.length === 0 ? null : Number(normalizedBodyweightInput)
  const bodyweightLbs = parsedBodyweight === null
    ? null
    : Math.round(displayToLbs(parsedBodyweight, preferredUnit) * 10) / 10
  const errors: StrengthProfileErrors = {}

  if (ageYears !== null && (!Number.isInteger(ageYears) || ageYears < 13 || ageYears > 100)) {
    errors.ageYears = 'Age must be a whole number between 13 and 100.'
  }

  if (bodyweightLbs !== null && (!Number.isFinite(bodyweightLbs) || bodyweightLbs < 50 || bodyweightLbs > 600)) {
    errors.bodyweight = preferredUnit === 'kg'
      ? 'Bodyweight must be between 22.7 and 272.2 kg.'
      : 'Bodyweight must be between 50 and 600 lbs.'
  }

  return {
    errors,
    values: {
      ageYears,
      bodyweightLbs,
      sex,
    } satisfies StrengthProfileValues,
  }
}

function StrengthProfileCard({
  profile,
  preferredUnit,
  isPending,
  onSave,
}: {
  profile: StrengthProfileSnapshot
  preferredUnit: PreferredUnit
  isPending: boolean
  onSave: (values: {
    ageYears: number | null
    bodyweightLbs: number | null
    sex: StrengthProfileSex | null
  }) => void
}) {
  const [draft, setDraft] = useState<StrengthProfileDraft>(() => createStrengthProfileDraft(profile, preferredUnit))
  const [visibleErrors, setVisibleErrors] = useState<StrengthProfileErrors>({})
  const ageErrorTimeoutRef = useRef<number | null>(null)
  const bodyweightErrorTimeoutRef = useRef<number | null>(null)
  const profileValues = createStrengthProfileValues(profile)
  const profileValuesKey = createStrengthProfileValuesKey(profileValues)
  const profileDraft = createStrengthProfileDraft(profile, preferredUnit)
  const { values: draftValues } = parseStrengthProfileDraft(draft, preferredUnit)
  const draftValuesKey = createStrengthProfileValuesKey(draftValues)
  const activeDraft = draftValuesKey === profileValuesKey ? profileDraft : draft
  const { errors, values } = parseStrengthProfileDraft(activeDraft, preferredUnit)
  const activeVisibleErrors: StrengthProfileErrors = draftValuesKey === profileValuesKey
    ? {}
    : {
        ageYears: errors.ageYears ? visibleErrors.ageYears : undefined,
        bodyweight: errors.bodyweight ? visibleErrors.bodyweight : undefined,
      }
  const valuesKey = createStrengthProfileValuesKey(values)
  const lastSubmittedValuesKeyRef = useRef(profileValuesKey)
  const requestSave = useEffectEvent((nextValues: StrengthProfileValues) => {
    onSave(nextValues)
  })

  const clearValidationTimeout = (field: StrengthProfileErrorField) => {
    const timeoutRef = field === 'ageYears' ? ageErrorTimeoutRef : bodyweightErrorTimeoutRef

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const setVisibleFieldError = (field: StrengthProfileErrorField, message?: string) => {
    setVisibleErrors((current) => {
      if (!message) {
        if (!current[field]) {
          return current
        }

        const next = { ...current }
        delete next[field]
        return next
      }

      if (current[field] === message) {
        return current
      }

      return {
        ...current,
        [field]: message,
      }
    })
  }

  const scheduleFieldError = (field: StrengthProfileErrorField, nextDraft: StrengthProfileDraft) => {
    clearValidationTimeout(field)

    const nextError = parseStrengthProfileDraft(nextDraft, preferredUnit).errors[field]

    if (!nextError) {
      setVisibleFieldError(field)
      return
    }

    const timeoutRef = field === 'ageYears' ? ageErrorTimeoutRef : bodyweightErrorTimeoutRef
    timeoutRef.current = window.setTimeout(() => {
      setVisibleFieldError(field, nextError)
      timeoutRef.current = null
    }, STRENGTH_PROFILE_ERROR_DELAY_MS)
  }

  const showFieldErrorOnBlur = (field: StrengthProfileErrorField) => {
    clearValidationTimeout(field)
    setVisibleFieldError(field, errors[field])
  }

  useEffect(() => {
    lastSubmittedValuesKeyRef.current = profileValuesKey
  }, [profileValuesKey])

  useEffect(() => {
    return () => {
      clearValidationTimeout('ageYears')
      clearValidationTimeout('bodyweight')
    }
  }, [])

  useEffect(() => {
    if (valuesKey !== profileValuesKey) {
      return
    }

    clearValidationTimeout('ageYears')
    clearValidationTimeout('bodyweight')
  }, [profileValuesKey, valuesKey])

  useEffect(() => {
    if (errors.ageYears || errors.bodyweight) {
      return
    }

    if (valuesKey === profileValuesKey || valuesKey === lastSubmittedValuesKeyRef.current) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      lastSubmittedValuesKeyRef.current = valuesKey
      requestSave(values)
    }, 300)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [errors.ageYears, errors.bodyweight, profileValuesKey, values, valuesKey])

  return (
    <Card className="surface-panel">
      <CardHeader>
        <CardTitle>Strength Profile</CardTitle>
        <CardDescription>
          Set the parameters used for strength standards, symmetry, and muscle balance.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="strength-profile-sex">Sex</Label>
            <Select
              value={activeDraft.sex}
              onValueChange={(value) => setDraft({
                ...activeDraft,
                sex: value === 'male' || value === 'female' ? value : '',
              })}
            >
              <SelectTrigger id="strength-profile-sex" className="h-9 w-full">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="strength-profile-age">Age</Label>
            <Input
              id="strength-profile-age"
              type="number"
              min={13}
              max={100}
              step="1"
              inputMode="numeric"
              value={activeDraft.ageYears}
              onChange={(event) => {
                const nextDraft = {
                  ...activeDraft,
                  ageYears: event.target.value,
                }

                setDraft(nextDraft)
                setVisibleFieldError('ageYears')
                scheduleFieldError('ageYears', nextDraft)
              }}
              onBlur={() => showFieldErrorOnBlur('ageYears')}
              aria-invalid={activeVisibleErrors.ageYears ? 'true' : 'false'}
              aria-describedby={activeVisibleErrors.ageYears ? 'strength-profile-age-error' : undefined}
            />
            {activeVisibleErrors.ageYears && (
              <p id="strength-profile-age-error" className="text-sm text-destructive">{activeVisibleErrors.ageYears}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="strength-profile-bodyweight">Bodyweight ({preferredUnit})</Label>
            <Input
              id="strength-profile-bodyweight"
              type="number"
              min={0}
              step={preferredUnit === 'kg' ? '0.5' : '1'}
              inputMode="decimal"
              value={activeDraft.bodyweight}
              onChange={(event) => {
                const nextDraft = {
                  ...activeDraft,
                  bodyweight: event.target.value,
                }

                setDraft(nextDraft)
                setVisibleFieldError('bodyweight')
                scheduleFieldError('bodyweight', nextDraft)
              }}
              onBlur={() => showFieldErrorOnBlur('bodyweight')}
              aria-invalid={activeVisibleErrors.bodyweight ? 'true' : 'false'}
              aria-describedby={activeVisibleErrors.bodyweight ? 'strength-profile-bodyweight-error' : undefined}
            />
            {activeVisibleErrors.bodyweight && (
              <p id="strength-profile-bodyweight-error" className="text-sm text-destructive">{activeVisibleErrors.bodyweight}</p>
            )}
          </div>
        </div>

        {isPending && (
          <p className="text-sm text-muted-foreground">
            Saving strength profile…
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { data: user, isLoading: isUserLoading } = useUser()
  const { data: profile, isLoading: isProfileLoading } = useProfile()
  const queryClient = useQueryClient()
  const hasMounted = useSyncExternalStore(subscribeToClientRender, () => true, () => false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { preferredUnit, setPreferredUnit, setWeightRoundingLbs, weightRoundingLbs } = useUiStore()
  const isGuest = isAnonymousUser(user)

  const syncOptimisticProfilePreferences = async (
    updater: (currentProfile: ProfilePreferences) => ProfilePreferences,
  ) => {
    await queryClient.cancelQueries({ queryKey: ['profile'] })
    const previousProfile = queryClient.getQueryData<ProfilePreferences | null>(['profile']) ?? null

    queryClient.setQueryData<ProfilePreferences | null>(['profile'], (currentProfile) => {
      if (!currentProfile) {
        return currentProfile
      }

      return updater(currentProfile)
    })

    return { previousProfile }
  }

  const updateUnit = useMutation({
    mutationKey: profilePreferenceMutationKeys.unit(),
    mutationFn: async ({
      rounding,
      unit,
    }: {
      rounding: WeightRoundingLbs
      unit: PreferredUnit
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_unit: unit, weight_rounding_lbs: rounding })
        .eq('id', user?.id ?? '')
      if (error) throw error
    },
    onMutate: async ({ rounding, unit }) => syncOptimisticProfilePreferences((currentProfile) => ({
      ...currentProfile,
      preferred_unit: unit,
      weight_rounding_lbs: rounding,
    })),
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(['profile'], context?.previousProfile ?? null)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
      await queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all() })
    },
  })

  const updateStrengthProfile = useMutation({
    mutationFn: async ({
      ageYears,
      bodyweightLbs,
      sex,
    }: {
      ageYears: number | null
      bodyweightLbs: number | null
      sex: StrengthProfileSex | null
    }) => {
      const { data, error } = await supabase.rpc('update_strength_profile', {
        p_age_years: ageYears,
        p_bodyweight_lbs: bodyweightLbs,
        p_sex: sex,
      })

      if (error) throw error

      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
      await queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all() })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateWeightRounding = useMutation({
    mutationKey: profilePreferenceMutationKeys.rounding(),
    mutationFn: async (rounding: WeightRoundingLbs) => {
      const { error } = await supabase
        .from('profiles')
        .update({ weight_rounding_lbs: rounding })
        .eq('id', user?.id ?? '')
      if (error) throw error
    },
    onMutate: async (rounding) => syncOptimisticProfilePreferences((currentProfile) => ({
      ...currentProfile,
      weight_rounding_lbs: rounding,
    })),
    onError: (_error, _rounding, context) => {
      queryClient.setQueryData(['profile'], context?.previousProfile ?? null)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
      await queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all() })
    },
  })

  const isPreferenceUpdatePending = updateUnit.isPending || updateWeightRounding.isPending
  const renderedPreferredUnit = hasMounted ? preferredUnit : 'lbs'
  const renderedWeightRoundingLbs = hasMounted ? weightRoundingLbs : DEFAULT_WEIGHT_ROUNDING_LBS
  const arePreferencesHydrated = !isUserLoading && (user == null || !isProfileLoading)
  const isPreferenceControlDisabled = !hasMounted || !arePreferencesHydrated || isPreferenceUpdatePending

  const handleUnitToggle = (unit: PreferredUnit) => {
    if (unit === preferredUnit || isPreferenceControlDisabled) return

    const previousUnit = preferredUnit
    const previousRounding = weightRoundingLbs
    const snappedRounding = snapWeightRoundingLbsToUnit(profile?.weight_rounding_lbs ?? weightRoundingLbs, unit)

    setPreferredUnit(unit)
    setWeightRoundingLbs(snappedRounding)

    if (user) {
      updateUnit.mutate({ rounding: snappedRounding, unit }, {
        onError: (error: Error) => {
          setPreferredUnit(previousUnit)
          setWeightRoundingLbs(previousRounding)
          toast.error(error.message)
        },
      })
    }
  }

  const handleStrengthProfileSave = (values: {
    ageYears: number | null
    bodyweightLbs: number | null
    sex: StrengthProfileSex | null
  }) => {
    updateStrengthProfile.mutate({
      ageYears: values.ageYears,
      bodyweightLbs: values.bodyweightLbs,
      sex: values.sex,
    })
  }

  const handleWeightRoundingChange = (rounding: WeightRoundingLbs) => {
    if (rounding === weightRoundingLbs || isPreferenceControlDisabled) return

    const previousRounding = weightRoundingLbs
    setWeightRoundingLbs(rounding)

    if (user) {
      updateWeightRounding.mutate(rounding, {
        onError: (error: Error) => {
          setWeightRoundingLbs(previousRounding)
          toast.error(error.message)
        },
      })
    }
  }

  const handleLogout = async () => {
    setIsSigningOut(true)

    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) {
      toast.error(error.message)
      setIsSigningOut(false)
      return
    }

    await clearAllPersistedQueryCaches().catch(() => undefined)
    queryClient.clear()

    router.replace('/continue')
  }

  const displayName = isGuest
    ? 'Guest account'
    : user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? 'Athlete'
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join('') || 'PI'
  const roundingOptions = getRoundingOptions(renderedPreferredUnit, renderedWeightRoundingLbs)

  return (
    <div className="page-shell max-w-5xl">
      <section className="page-header">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Preferences</span>
          <div className="flex flex-col gap-2">
            <h1 className="page-title">Settings</h1>
            <p className="page-copy">
              Account, units, and preferences.
            </p>
          </div>
        </div>
      </section>

      <div className="flex w-full max-w-3xl flex-col gap-6">
        <Card className="surface-panel">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {!isGuest && (
                <Avatar size="lg">
                  {user?.user_metadata?.avatar_url && (
                    <AvatarImage src={user.user_metadata.avatar_url as string} alt={displayName} />
                  )}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              )}
              <div className="flex flex-col gap-1">
                <span className="eyebrow">Account</span>
                <h2 className="text-2xl font-semibold tracking-[-0.06em] text-foreground">{displayName}</h2>
                <p className="text-sm text-muted-foreground">
                  {isGuest
                    ? 'This guest account is temporary and can be lost. Sign in with Google to keep your data.'
                    : user?.email ?? '—'}
                </p>
              </div>
            </div>

            {isGuest && (
              <Link href="/upgrade" className={buttonVariants({ size: 'lg', className: 'w-full sm:w-auto' })}>
                Sign In with Google
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className="surface-panel">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Choose your preferred color scheme.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeToggle />
          </CardContent>
        </Card>

        <Card className="surface-panel">
          <CardHeader>
            <CardTitle>Weight Unit</CardTitle>
            <CardDescription>
                Choose the unit system used across the app.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ToggleGroup
              value={[renderedPreferredUnit]}
              role="radiogroup"
              aria-label="Preferred weight unit"
              onValueChange={(value: string[]) => {
                const nextValue = value[0]
                if (nextValue === 'lbs' || nextValue === 'kg') {
                  handleUnitToggle(nextValue)
                }
              }}
              variant="outline"
              spacing={2}
              className="w-full"
            >
              <ToggleGroupItem value="lbs" role="radio" aria-checked={renderedPreferredUnit === 'lbs'} disabled={isPreferenceControlDisabled} className="flex-1 justify-center">
                Pounds (lbs)
              </ToggleGroupItem>
              <ToggleGroupItem value="kg" role="radio" aria-checked={renderedPreferredUnit === 'kg'} disabled={isPreferenceControlDisabled} className="flex-1 justify-center">
                Kilograms (kg)
              </ToggleGroupItem>
            </ToggleGroup>

            {updateUnit.isPending && (
              <p className="text-sm text-muted-foreground">
                <Ruler className="mr-1 inline-block size-3.5" />
                Saving preference…
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="surface-panel">
          <CardHeader>
            <CardTitle>Weight Rounding</CardTitle>
            <CardDescription>
              Applies to prescribed loads, training maxes, estimated 1RM, and weight displays across the app.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="weight-rounding">Rounding increment ({renderedPreferredUnit})</Label>
              <Select
                value={String(renderedWeightRoundingLbs)}
                onValueChange={(value) => {
                  if (value === null) {
                    return
                  }

                  const nextRounding = parseWeightRoundingLbs(value)

                  if (nextRounding !== null) {
                    handleWeightRoundingChange(nextRounding)
                  }
                }}
                items={roundingOptions.map((option) => ({ value: String(option.value), label: option.label }))}
              >
                <SelectTrigger id="weight-rounding" className="h-9 w-full max-w-xs" disabled={isPreferenceControlDisabled}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {roundingOptions.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {updateWeightRounding.isPending && (
              <p className="text-sm text-muted-foreground">
                <Ruler className="mr-1 inline-block size-3.5" />
                Saving rounding preference…
              </p>
            )}
          </CardContent>
        </Card>

        <StrengthProfileCard
          key={renderedPreferredUnit}
          profile={profile}
          preferredUnit={renderedPreferredUnit}
          isPending={updateStrengthProfile.isPending}
          onSave={handleStrengthProfileSave}
        />

        <Card className="border-destructive/20 bg-destructive/5 shadow-[0_24px_80px_-42px_rgba(0,0,0,0.85)]">
          <CardHeader>
            <CardTitle>{isGuest ? 'End Guest Session' : 'Danger Zone'}</CardTitle>
            <CardDescription>
              {isGuest
                ? 'End this temporary session on this device and return to Get Started.'
                : 'End the current session on this device.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleLogout} disabled={isSigningOut}>
              <LogOut data-icon="inline-start" />
              {isSigningOut ? 'Signing Out…' : 'Sign Out'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
