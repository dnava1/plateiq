'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LogOut, Ruler } from 'lucide-react'
import { toast } from 'sonner'
import { isAnonymousUser } from '@/lib/auth/auth-state'
import { useProfile } from '@/hooks/useProfile'
import { useUser } from '@/hooks/useUser'
import { useSupabase } from '@/hooks/useSupabase'
import { analyticsQueryKeys } from '@/hooks/useAnalytics'
import { useUiStore } from '@/store/uiStore'
import { clearAllPersistedQueryCaches } from '@/lib/query-persistence'
import { displayToLbs, lbsToDisplay } from '@/lib/utils'
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
import type { PreferredUnit, StrengthProfileSex } from '@/types/domain'

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

function createStrengthProfileDraft(profile: StrengthProfileSnapshot, preferredUnit: PreferredUnit): StrengthProfileDraft {
  return {
    ageYears: profile?.strength_profile_age_years !== null && profile?.strength_profile_age_years !== undefined
      ? String(profile.strength_profile_age_years)
      : '',
    bodyweight: formatStrengthProfileWeight(profile?.strength_profile_bodyweight_lbs ?? null, preferredUnit),
    sex: profile?.strength_profile_sex ?? '',
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

  const handleSave = () => {
    const normalizedAgeInput = draft.ageYears.trim()
    const normalizedBodyweightInput = draft.bodyweight.trim()
    const normalizedSex = draft.sex === 'male' || draft.sex === 'female'
      ? draft.sex
      : null
    const parsedAgeYears = normalizedAgeInput.length === 0 ? null : Number(normalizedAgeInput)
    const parsedBodyweight = normalizedBodyweightInput.length === 0 ? null : Number(normalizedBodyweightInput)

    if (parsedAgeYears !== null && (!Number.isInteger(parsedAgeYears) || parsedAgeYears < 13 || parsedAgeYears > 100)) {
      toast.error('Age must be a whole number between 13 and 100.')
      return
    }

    if (parsedBodyweight !== null && (!Number.isFinite(parsedBodyweight) || parsedBodyweight <= 0)) {
      toast.error('Bodyweight must be a positive number.')
      return
    }

    onSave({
      ageYears: parsedAgeYears,
      bodyweightLbs: parsedBodyweight === null ? null : displayToLbs(parsedBodyweight, preferredUnit),
      sex: normalizedSex,
    })
  }

  return (
    <Card className="surface-panel">
      <CardHeader>
        <CardTitle>Strength Profile</CardTitle>
        <CardDescription>
          Set the athlete details PlateIQ uses for strength standards, symmetry, and muscle-balance scoring.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="strength-profile-sex">Sex</Label>
            <Select
              value={draft.sex}
              onValueChange={(value) => setDraft((current) => ({ ...current, sex: value === 'male' || value === 'female' ? value : '' }))}
            >
              <SelectTrigger id="strength-profile-sex" className="h-9 w-full">
                <SelectValue placeholder="Select sex" />
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
              value={draft.ageYears}
              onChange={(event) => setDraft((current) => ({ ...current, ageYears: event.target.value }))}
              placeholder="e.g. 32"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="strength-profile-bodyweight">Bodyweight ({preferredUnit})</Label>
            <Input
              id="strength-profile-bodyweight"
              type="number"
              min={0}
              step={preferredUnit === 'kg' ? '0.5' : '1'}
              inputMode="decimal"
              value={draft.bodyweight}
              onChange={(event) => setDraft((current) => ({ ...current, bodyweight: event.target.value }))}
              placeholder={preferredUnit === 'kg' ? 'e.g. 82.5' : 'e.g. 181'}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {profile?.strength_profile_sex !== null
              && profile?.strength_profile_sex !== undefined
              && profile?.strength_profile_age_years !== null
              && profile?.strength_profile_age_years !== undefined
              && profile?.strength_profile_bodyweight_lbs !== null
              && profile?.strength_profile_bodyweight_lbs !== undefined
              ? `Saved profile: ${profile.strength_profile_sex}, age ${profile.strength_profile_age_years}, ${formatStrengthProfileWeight(profile.strength_profile_bodyweight_lbs, preferredUnit)} ${preferredUnit}.`
              : 'Complete all three fields to unlock strength standards in Analytics.'}
          </div>

          <Button size="lg" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving Strength Profile…' : 'Save Strength Profile'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useSupabase()
  const { data: user } = useUser()
  const { data: profile } = useProfile()
  const queryClient = useQueryClient()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { preferredUnit, setPreferredUnit } = useUiStore()
  const isGuest = isAnonymousUser(user)

  const updateUnit = useMutation({
    mutationFn: async (unit: PreferredUnit) => {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_unit: unit })
        .eq('id', user?.id ?? '')
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
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
      const { error } = await supabase.rpc('update_strength_profile', {
        ...(ageYears !== null ? { p_age_years: ageYears } : {}),
        ...(bodyweightLbs !== null ? { p_bodyweight_lbs: bodyweightLbs } : {}),
        ...(sex !== null ? { p_sex: sex } : {}),
      })

      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
      await queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all() })
      toast.success('Strength profile saved.')
    },
  })

  const handleUnitToggle = (unit: PreferredUnit) => {
    if (unit === preferredUnit) return

    const previousUnit = preferredUnit
    setPreferredUnit(unit)

    if (user) {
      updateUnit.mutate(unit, {
        onError: (error: Error) => {
          setPreferredUnit(previousUnit)
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
  const upgraded = searchParams.get('upgraded') === '1'

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
        {upgraded && (
          <div className="rounded-3xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            This guest session is now a permanent account.
          </div>
        )}

        <Card className="surface-panel">
          <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar size="lg">
                {user?.user_metadata?.avatar_url && (
                  <AvatarImage src={user.user_metadata.avatar_url as string} alt={displayName} />
                )}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <span className="eyebrow">Account</span>
                <h2 className="text-2xl font-semibold tracking-[-0.06em] text-foreground">{displayName}</h2>
                <p className="text-sm text-muted-foreground">
                  {isGuest
                    ? 'Training data is tied to a temporary guest account. Create a permanent account to avoid losing your data.'
                    : user?.email ?? '—'}
                </p>
              </div>
            </div>

            {isGuest && (
              <Link href="/upgrade" className={buttonVariants({ size: 'lg', className: 'w-full sm:w-auto' })}>
                Create Account
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
              Choose the unit system PlateIQ should prefer across training maxes and progression.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ToggleGroup
              value={[preferredUnit]}
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
              <ToggleGroupItem value="lbs" role="radio" aria-checked={preferredUnit === 'lbs'} disabled={updateUnit.isPending} className="flex-1 justify-center">
                Pounds (lbs)
              </ToggleGroupItem>
              <ToggleGroupItem value="kg" role="radio" aria-checked={preferredUnit === 'kg'} disabled={updateUnit.isPending} className="flex-1 justify-center">
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

        <StrengthProfileCard
          key={[
            profile?.id ?? 'anonymous',
            profile?.strength_profile_sex ?? 'none',
            profile?.strength_profile_age_years ?? 'none',
            profile?.strength_profile_bodyweight_lbs ?? 'none',
            preferredUnit,
          ].join(':')}
          profile={profile}
          preferredUnit={preferredUnit}
          isPending={updateStrengthProfile.isPending}
          onSave={handleStrengthProfileSave}
        />

        {!isGuest && (
          <Card className="border-destructive/20 bg-destructive/5 shadow-[0_24px_80px_-42px_rgba(0,0,0,0.85)]">
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>
                End the current session on this device and return to Get Started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleLogout} disabled={isSigningOut}>
                <LogOut data-icon="inline-start" />
                {isSigningOut ? 'Signing Out…' : 'Sign Out'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
