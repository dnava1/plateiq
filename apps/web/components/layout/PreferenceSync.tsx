'use client'

import { useEffect } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { isWeightRoundingLbs } from '@/lib/utils'
import { useUiStore } from '@/store/uiStore'

export function PreferenceSync() {
  const { data: profile } = useProfile()
  const setPreferredUnit = useUiStore((state) => state.setPreferredUnit)
  const setWeightRoundingLbs = useUiStore((state) => state.setWeightRoundingLbs)
  const profileUnit = profile?.preferred_unit
  const profileWeightRounding = profile?.weight_rounding_lbs

  useEffect(() => {
    if (profileUnit !== 'lbs' && profileUnit !== 'kg') return
    setPreferredUnit(profileUnit)
  }, [profileUnit, setPreferredUnit])

  useEffect(() => {
    if (!isWeightRoundingLbs(profileWeightRounding)) return
    setWeightRoundingLbs(profileWeightRounding)
  }, [profileWeightRounding, setWeightRoundingLbs])

  return null
}