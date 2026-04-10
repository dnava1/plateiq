'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useSupabase } from '@/hooks/useSupabase'
import { useUiStore } from '@/store/uiStore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LogOut, Ruler } from 'lucide-react'
import { toast } from 'sonner'
import type { PreferredUnit } from '@/types/domain'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { data: user } = useUser()
  const queryClient = useQueryClient()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { preferredUnit, setPreferredUnit } = useUiStore()

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
        onError: (error) => {
          setPreferredUnit(previousUnit)
          toast.error(error.message)
        },
      })
    }
  }

  const handleLogout = async () => {
    setIsSigningOut(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error(error.message)
      setIsSigningOut(false)
      return
    }
    router.push('/login')
  }

  const displayName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? 'Athlete'
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join('') || 'PI'

  return (
    <div className="page-shell max-w-3xl">
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
              <p className="text-sm text-muted-foreground">{user?.email ?? '—'}</p>
            </div>
          </div>
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
            onValueChange={(value) => {
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
            End the current session on this device.
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
  )
}
