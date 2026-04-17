'use client'

import { useUiStore } from '@/store/uiStore'

export function usePreferredWeightRounding() {
  return useUiStore((state) => state.weightRoundingLbs)
}