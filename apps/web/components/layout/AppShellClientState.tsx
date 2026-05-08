'use client'

import { createContext, useContext } from 'react'
import type { AppNavHref } from '@/components/layout/navigation'

export interface AppShellClientStateValue {
  authScope: string | null
  cacheScope: string | null
  isAuthReady: boolean
  isWarmDataReady: boolean
  pendingNavHref: AppNavHref | null
  setPendingNavHref: (href: AppNavHref | null) => void
}

const AppShellClientStateContext = createContext<AppShellClientStateValue>({
  authScope: null,
  cacheScope: null,
  isAuthReady: false,
  isWarmDataReady: false,
  pendingNavHref: null,
  setPendingNavHref: () => undefined,
})

export function AppShellClientStateProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: AppShellClientStateValue
}) {
  return (
    <AppShellClientStateContext.Provider value={value}>
      {children}
    </AppShellClientStateContext.Provider>
  )
}

export function useAppShellClientState() {
  return useContext(AppShellClientStateContext)
}