'use client'

import { useUiStore } from '@/store/uiStore'

export function usePreferredUnit() {
  return useUiStore((state) => state.preferredUnit)
}