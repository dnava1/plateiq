'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getAuthScope } from '@/lib/auth/auth-state'
import { getStoredAuthScopeHint } from '@/lib/auth/session-user'
import { APP_NAV_ITEMS, isActiveNavPath, type AppNavHref } from '@/components/layout/navigation'
import { useUiStore } from '@/store/uiStore'
import { createClient } from '@/lib/supabase/client'
import {
  clearPersistedQueryCache,
  clearLegacyPersistedQueryCache,
  createIdbPersister,
  QUERY_CACHE_MAX_AGE,
  getQueryPersistenceBuster,
} from '@/lib/query-persistence'
import { AppShellClientStateProvider } from '@/components/layout/AppShellClientState'

const PENDING_NAV_TIMEOUT_MS = 3_000

function makeQueryClient(scope: string) {
  void scope

  const queryClient = new QueryClient({
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

  return queryClient
}

function ThemeSync() {
  const theme = useUiStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    document.cookie = `plateiq-theme=${theme}; path=/; max-age=31536000; samesite=lax`

    const applyDark = (dark: boolean) => {
      root.classList.toggle('dark', dark)
      root.style.colorScheme = dark ? 'dark' : 'light'
      root.style.backgroundColor = dark ? '#06070a' : '#fafafc'
      const themeColor = getComputedStyle(root).getPropertyValue('--pwa-theme-color').trim()

      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
        meta.setAttribute('content', themeColor)
      })
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
  const pathname = usePathname()
  const [supabase] = useState(() => createClient())
  const [cacheScopeHint, setCacheScopeHint] = useState<string | null>(() => getStoredAuthScopeHint())
  const [authScope, setAuthScope] = useState<string | null>(null)
  const [pendingNavHref, setPendingNavHref] = useState<AppNavHref | null>(null)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [restoredCacheScope, setRestoredCacheScope] = useState<string | null>(null)
  const initialCacheScopeHintRef = useRef(cacheScopeHint)
  const previousAuthScopeRef = useRef<string | null>(null)
  const hydratedMutationScopeRef = useRef<string | null>(null)
  const isAuthenticatedAppPath = APP_NAV_ITEMS.some((item) => isActiveNavPath(pathname, item.href))
  const shouldDeferHintRestore = !isAuthReady
    && (pathname === '/launch' || isAuthenticatedAppPath)
    && typeof navigator !== 'undefined'
    && navigator.onLine
  const cacheScope = isAuthReady ? authScope : shouldDeferHintRestore ? null : cacheScopeHint
  const queryClientScope = cacheScope ?? 'signed-out'
  const queryClient = useMemo(() => makeQueryClient(queryClientScope), [queryClientScope])
  const persister = useMemo(() => {
    return cacheScope ? createIdbPersister(cacheScope) : null
  }, [cacheScope])
  const isWarmDataReady = !cacheScope || restoredCacheScope === cacheScope

  useEffect(() => {
    if (!pendingNavHref) {
      return
    }

    if (!isAuthenticatedAppPath || isActiveNavPath(pathname, pendingNavHref)) {
      setPendingNavHref(null)
    }
  }, [isAuthenticatedAppPath, pathname, pendingNavHref])

  useEffect(() => {
    if (!pendingNavHref) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setPendingNavHref((currentHref) => currentHref === pendingNavHref ? null : currentHref)
    }, PENDING_NAV_TIMEOUT_MS)

    return () => window.clearTimeout(timeoutId)
  }, [pendingNavHref])

  useEffect(() => {
    let isActive = true

    void clearLegacyPersistedQueryCache().catch(() => undefined)

    const applyAuthScope = (nextScope: string | null) => {
      if (!isActive) return

      setIsAuthReady(true)
      setAuthScope(nextScope)
      setCacheScopeHint(nextScope)
    }

    const resolveInitialScope = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!isActive) return

      if (error) {
        applyAuthScope(null)
        return
      }

      applyAuthScope(getAuthScope(data.session?.user ?? null))
    }

    void resolveInitialScope()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      applyAuthScope(getAuthScope(session?.user ?? null))
    })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [queryClient, supabase])

  useEffect(() => {
    setRestoredCacheScope((currentScope) => currentScope === cacheScope ? currentScope : null)
  }, [cacheScope])

  useEffect(() => {
    if (!isAuthReady || typeof window === 'undefined') {
      return
    }

    if (!authScope) {
      window.localStorage.removeItem('plateiq-query-cache:last-user')
      window.localStorage.removeItem('plateiq-offline-workout:last-user')
      return
    }

    window.localStorage.setItem('plateiq-query-cache:last-user', authScope)
    window.localStorage.setItem('plateiq-offline-workout:last-user', authScope)
  }, [authScope, isAuthReady, pathname])

  useEffect(() => {
    if (!isAuthReady) {
      return
    }

    const staleBootScope = previousAuthScopeRef.current === null
      ? initialCacheScopeHintRef.current && initialCacheScopeHintRef.current !== authScope
        ? initialCacheScopeHintRef.current
        : null
      : null
    const previousScope = previousAuthScopeRef.current
    previousAuthScopeRef.current = authScope
    initialCacheScopeHintRef.current = authScope

    const scopesToClear = [staleBootScope, previousScope]
      .filter((scope, index, scopes): scope is string => Boolean(scope) && scopes.indexOf(scope) === index)

    if (scopesToClear.length === 0) {
      return
    }

    void clearLegacyPersistedQueryCache().catch(() => undefined)
    void Promise.all(scopesToClear.map((scope) => clearPersistedQueryCache(scope))).catch(() => undefined)
    void import('@/lib/offline-workout-store')
      .then(({ clearOfflineWorkoutState }) => Promise.all(scopesToClear.map((scope) => clearOfflineWorkoutState(scope))))
      .catch(() => undefined)
  }, [authScope, isAuthReady])

  useEffect(() => {
    if (!isAuthReady || !authScope || !cacheScope || authScope !== cacheScope || !isWarmDataReady) {
      hydratedMutationScopeRef.current = null
      return
    }

    if (hydratedMutationScopeRef.current === authScope) {
      return
    }

    hydratedMutationScopeRef.current = authScope
    let isActive = true

    void (async () => {
      const [{ registerWorkoutMutationDefaults }, { drainOfflineWorkoutOutbox }] = await Promise.all([
        import('@/lib/workout-mutation-defaults'),
        import('@/lib/offline-workout-sync'),
      ])

      if (!isActive) {
        return
      }

      registerWorkoutMutationDefaults(queryClient, supabase)
      await queryClient.resumePausedMutations()
      await drainOfflineWorkoutOutbox({
        queryClient,
        supabase,
        userId: authScope,
      })
    })().catch(() => undefined)

    return () => {
      isActive = false
    }
  }, [authScope, cacheScope, isAuthReady, isWarmDataReady, queryClient, supabase])

  const content = (
    <AppShellClientStateProvider
      value={{
        authScope,
        cacheScope,
        isAuthReady,
        isWarmDataReady,
        pendingNavHref,
        setPendingNavHref,
      }}
    >
      <ThemeSync />
      {children}
    </AppShellClientStateProvider>
  )

  if (!cacheScope || !persister) {
    return (
      <QueryClientProvider client={queryClient}>
        {content}
      </QueryClientProvider>
    )
  }

  return (
    <PersistQueryClientProvider
      key={authScope}
      client={queryClient}
      persistOptions={{
        persister,
        buster: getQueryPersistenceBuster(cacheScope),
        maxAge: QUERY_CACHE_MAX_AGE,
      }}
      onSuccess={() => {
        setRestoredCacheScope(cacheScope)
      }}
    >
      {content}
    </PersistQueryClientProvider>
  )
}
