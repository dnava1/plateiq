'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LogOut, Ruler } from 'lucide-react'
import { toast } from 'sonner'
import {
  clearPendingGuestMergeClient,
  finalizePendingGuestMergeClient,
  getPendingGuestMergeStatusClient,
} from '@/lib/auth/merge-client'
import { isAnonymousUser } from '@/lib/auth/auth-state'
import { useUser } from '@/hooks/useUser'
import { useSupabase } from '@/hooks/useSupabase'
import { useUiStore } from '@/store/uiStore'
import { clearAllPersistedQueryCaches } from '@/lib/query-persistence'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import type { PreferredUnit } from '@/types/domain'

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useSupabase()
  const { data: user } = useUser()
  const queryClient = useQueryClient()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [mergeRecovery, setMergeRecovery] = useState({
    loaded: false,
    pending: false,
    canFinalize: false,
  })
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

  const handleLogout = async () => {
    setIsSigningOut(true)

    await clearPendingGuestMergeClient().catch(() => undefined)

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
  const merged = searchParams.get('merged') === '1'
  const upgraded = searchParams.get('upgraded') === '1'
  const mergeState = searchParams.get('merge')
  const mergeFailed = mergeState === 'failed' || mergeState === 'resume'
  const mergeExpired = mergeState === 'expired'
  const effectiveMergeRecovery = !user || isGuest
    ? {
        loaded: true,
        pending: false,
        canFinalize: false,
      }
    : mergeRecovery

  useEffect(() => {
    if (!user || isGuest) {
      return
    }

    let isActive = true

    void getPendingGuestMergeStatusClient()
      .then((status) => {
        if (!isActive) {
          return
        }

        setMergeRecovery({
          loaded: true,
          pending: status.pending,
          canFinalize: status.canFinalize,
        })
      })
      .catch((error) => {
        console.error('failed to load guest merge recovery status', {
          message: error instanceof Error ? error.message : String(error),
          userId: user.id,
        })

        if (!isActive) {
          return
        }

        setMergeRecovery({
          loaded: true,
          pending: false,
          canFinalize: false,
        })
      })

    return () => {
      isActive = false
    }
  }, [isGuest, user])

  const resumeMerge = useMutation({
    mutationFn: finalizePendingGuestMergeClient,
    onSuccess: async () => {
      setMergeRecovery({
        loaded: true,
        pending: false,
        canFinalize: false,
      })
      await queryClient.invalidateQueries({ queryKey: ['user'] })
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
      router.replace('/settings?merged=1')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const cancelMerge = useMutation({
    mutationFn: clearPendingGuestMergeClient,
    onSuccess: () => {
      setMergeRecovery({
        loaded: true,
        pending: false,
        canFinalize: false,
      })
      router.replace('/settings')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  return (
    <div className="page-shell max-w-5xl">
      <section className="page-header">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Preferences</span>
          <div className="flex flex-col gap-2">
            <h1 className="page-title">Settings</h1>
            <p className="page-copy">
              Keep your account details visible, tune units quickly, and manage the session without clutter.
            </p>
          </div>
        </div>
      </section>

      <div className="flex w-full max-w-3xl flex-col gap-6">
        {(merged || upgraded || mergeFailed || mergeExpired) && (
          <div className={(mergeFailed || mergeExpired)
            ? 'rounded-3xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive'
            : 'rounded-3xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground'}>
            {mergeExpired
              ? 'The guest merge request expired before it finished. Start it again from the guest account if you still need to move that data.'
              : mergeFailed
                ? 'The guest merge did not finish cleanly. If the recovery panel appears below, you can retry it safely from this account.'
              : merged
                ? 'Your guest training history was merged into this account.'
                : 'This guest session is now a permanent account.'}
          </div>
        )}

        {!isGuest && effectiveMergeRecovery.loaded && effectiveMergeRecovery.pending && (
          <Card className="border-primary/20 bg-primary/5 shadow-[0_24px_80px_-42px_rgba(0,0,0,0.85)]">
            <CardHeader>
              <CardTitle>{effectiveMergeRecovery.canFinalize ? 'Finish the pending guest merge' : 'Pending guest merge detected'}</CardTitle>
              <CardDescription>
                {effectiveMergeRecovery.canFinalize
                  ? 'The browser still has a guest merge prepared for this account. Finish it now or cancel it before you sign out.'
                  : 'This browser still has a guest merge prepared for a different account. Sign into the intended account to finish it, or cancel it here.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              {effectiveMergeRecovery.canFinalize && (
                <Button size="lg" onClick={() => resumeMerge.mutate()} disabled={resumeMerge.isPending || cancelMerge.isPending}>
                  {resumeMerge.isPending ? 'Finishing Merge…' : 'Resume Merge'}
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                onClick={() => cancelMerge.mutate()}
                disabled={resumeMerge.isPending || cancelMerge.isPending}
              >
                {cancelMerge.isPending ? 'Cancelling…' : 'Cancel Pending Merge'}
              </Button>
            </CardContent>
          </Card>
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
                  {isGuest ? 'Training data is tied to a temporary guest account until you upgrade it.' : user?.email ?? '—'}
                </p>
              </div>
            </div>

            {isGuest && (
              <Link href="/upgrade" className={buttonVariants({ size: 'lg', className: 'w-full sm:w-auto' })}>
                Upgrade Account
              </Link>
            )}
          </CardContent>
        </Card>

        {isGuest && (
          <Card className="border-primary/20 bg-primary/5 shadow-[0_24px_80px_-42px_rgba(0,0,0,0.85)]">
            <CardHeader>
              <CardTitle>Upgrade this guest session</CardTitle>
              <CardDescription>
                Link Google, add email and password, or merge this training history into an account you already use.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/upgrade" className={buttonVariants({ size: 'lg', className: 'w-full sm:w-auto' })}>
                Open Upgrade Flow
              </Link>
            </CardContent>
          </Card>
        )}

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

        <Card className="border-destructive/20 bg-destructive/5 shadow-[0_24px_80px_-42px_rgba(0,0,0,0.85)]">
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>
              End the current session on this device and return to continue.
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
