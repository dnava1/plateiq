'use client'

import { useIsMutating } from '@tanstack/react-query'
import { useEffect } from 'react'
import { profilePreferenceMutationKeys, useProfile } from '@/hooks/useProfile'
import { isWeightRoundingLbs } from '@/lib/utils'
import { useUiStore } from '@/store/uiStore'

export function PreferenceSync() {
  const { data: profile } = useProfile()
  const pendingPreferenceMutations = useIsMutating({ mutationKey: profilePreferenceMutationKeys.all() })
  const setPreferredUnit = useUiStore((state) => state.setPreferredUnit)
  const setWeightRoundingLbs = useUiStore((state) => state.setWeightRoundingLbs)
  const profileUnit = profile?.preferred_unit
  const profileWeightRounding = profile?.weight_rounding_lbs

  useEffect(() => {
    if (pendingPreferenceMutations > 0) return
    if (profileUnit !== 'lbs' && profileUnit !== 'kg') return
    setPreferredUnit(profileUnit)
  }, [pendingPreferenceMutations, profileUnit, setPreferredUnit])

  useEffect(() => {
    if (pendingPreferenceMutations > 0) return
    if (!isWeightRoundingLbs(profileWeightRounding)) return
    setWeightRoundingLbs(profileWeightRounding)
  }, [pendingPreferenceMutations, profileWeightRounding, setWeightRoundingLbs])

  return null
}