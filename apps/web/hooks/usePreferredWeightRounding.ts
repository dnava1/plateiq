'use client'

import { getDefaultWeightRoundingLbs } from '@/lib/utils'
import { usePreferredUnit } from './usePreferredUnit'

export function usePreferredWeightRounding() {
  const preferredUnit = usePreferredUnit()

  return getDefaultWeightRoundingLbs(preferredUnit)
}