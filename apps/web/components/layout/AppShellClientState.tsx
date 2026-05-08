'use client'

import { createContext, useContext } from 'react'

export interface AppShellClientStateValue {
  authScope: string | null
  cacheScope: string | null
  isAuthReady: boolean
  isWarmDataReady: boolean
}

const AppShellClientStateContext = createContext<AppShellClientStateValue>({
  authScope: null,
  cacheScope: null,
  isAuthReady: false,
  isWarmDataReady: false,
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