'use client'

import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useSupabase } from '@/hooks/useSupabase'
import { useUiStore } from '@/store/uiStore'
import { Button } from '@/components/ui/button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { PreferredUnit } from '@/types/domain'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { data: user } = useUser()
  const queryClient = useQueryClient()
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
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })

  const handleUnitToggle = (unit: PreferredUnit) => {
    setPreferredUnit(unit)
    if (user) {
      updateUnit.mutate(unit)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Account Info */}
      <div className="rounded-lg border bg-card p-6 space-y-3">
        <h2 className="font-semibold">Account</h2>
        <div className="text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">Email:</span>{' '}
            {user?.email ?? '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Name:</span>{' '}
            {user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? '—'}
          </p>
        </div>
      </div>

      {/* Unit Preference */}
      <div className="rounded-lg border bg-card p-6 space-y-3">
        <h2 className="font-semibold">Weight Unit</h2>
        <div className="flex gap-2">
          <Button
            variant={preferredUnit === 'lbs' ? 'default' : 'outline'}
            onClick={() => handleUnitToggle('lbs')}
            className="flex-1"
          >
            Pounds (lbs)
          </Button>
          <Button
            variant={preferredUnit === 'kg' ? 'default' : 'outline'}
            onClick={() => handleUnitToggle('kg')}
            className="flex-1"
          >
            Kilograms (kg)
          </Button>
        </div>
      </div>

      {/* Sign Out */}
      <div className="rounded-lg border bg-card p-6">
        <Button variant="destructive" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>
    </div>
  )
}
