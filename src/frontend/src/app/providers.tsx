'use client'

import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { get, set, del } from 'idb-keyval'
import { useState, useEffect } from 'react'
import { useUiStore } from '@/store/uiStore'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
      },
      mutations: {
        networkMode: 'offlineFirst',
      },
    },
  })
}

function createIdbPersister() {
  return {
    persistClient: async (client: unknown) => {
      await set('plateiq-query-cache', client)
    },
    restoreClient: async () => {
      return await get('plateiq-query-cache')
    },
    removeClient: async () => {
      await del('plateiq-query-cache')
    },
  }
}

const persister = createIdbPersister()

function ThemeSync() {
  const theme = useUiStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    const applyDark = (dark: boolean) => {
      root.classList.toggle('dark', dark)
      root.style.colorScheme = dark ? 'dark' : 'light'
    }
    if (theme === 'dark') {
      applyDark(true)
      return
    }
    if (theme === 'light') {
      applyDark(false)
      return
    }
    // system — follow OS preference
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    applyDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => applyDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient)

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
    >
      <ThemeSync />
      {children}
    </PersistQueryClientProvider>
  )
}
