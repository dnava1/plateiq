'use client'

import { useIsMutating } from '@tanstack/react-query'
import { useEffect } from 'react'
import { profilePreferenceMutationKeys, useProfile } from '@/hooks/useProfile'
import { useUiStore } from '@/store/uiStore'

export function PreferenceSync() {
  const { data: profile } = useProfile()
  const pendingPreferenceMutations = useIsMutating({ mutationKey: profilePreferenceMutationKeys.all() })
  const setPreferredUnit = useUiStore((state) => state.setPreferredUnit)
  const profileUnit = profile?.preferred_unit

  useEffect(() => {
    if (pendingPreferenceMutations > 0) return
    if (profileUnit !== 'lbs' && profileUnit !== 'kg') return
    setPreferredUnit(profileUnit)
  }, [pendingPreferenceMutations, profileUnit, setPreferredUnit])

  return null
}