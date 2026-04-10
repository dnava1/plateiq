'use client'

import { useEffect } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { useUiStore } from '@/store/uiStore'

export function PreferenceSync() {
  const { data: profile } = useProfile()
  const setPreferredUnit = useUiStore((state) => state.setPreferredUnit)
  const profileUnit = profile?.preferred_unit

  useEffect(() => {
    if (profileUnit !== 'lbs' && profileUnit !== 'kg') return
    setPreferredUnit(profileUnit)
  }, [profileUnit, setPreferredUnit])

  return null
}