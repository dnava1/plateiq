'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getAuthScope } from '@/lib/auth/auth-state'
import { useUiStore } from '@/store/uiStore'
import { createClient } from '@/lib/supabase/client'
import { analyticsQueryKeys } from '@/hooks/useAnalytics'
import { dashboardQueryKeys } from '@/hooks/useDashboard'
import {
  clearAllPersistedQueryCaches,
  clearLegacyPersistedQueryCache,
  createIdbPersister,
  getQueryPersistenceBuster,
} from '@/lib/query-persistence'
import {
  completeWorkoutMutation,
  ensureWorkoutMutation,
  logSetMutation,
  workoutMutationKeys,
  workoutQueryKeys,
  type CompleteWorkoutInput,
  type EnsureWorkoutInput,
  type LogSetInput,
} from '@/hooks/useWorkouts'

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

  const supabase = createClient()

  queryClient.setMutationDefaults(workoutMutationKeys.ensureWorkout(), {
    mutationFn: (variables) => ensureWorkoutMutation(supabase, variables as unknown as EnsureWorkoutInput),
    onSuccess: (_data, variables) => {
      const input = variables as unknown as EnsureWorkoutInput
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.cycle(input.cycleId) })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
  })

  queryClient.setMutationDefaults(workoutMutationKeys.logSet(), {
    mutationFn: (variables) => logSetMutation(supabase, variables as unknown as LogSetInput),
    onSuccess: (_data, variables) => {
      const input = variables as unknown as LogSetInput
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.sets(input.workoutId) })
      if (input.isAmrap) {
        queryClient.invalidateQueries({ queryKey: workoutQueryKeys.amrapHistory(input.exerciseId) })
      }
      queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all() })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
  })

  queryClient.setMutationDefaults(workoutMutationKeys.completeWorkout(), {
    mutationFn: (variables) => completeWorkoutMutation(supabase, variables as unknown as CompleteWorkoutInput),
    onSuccess: (_data, variables) => {
      const input = variables as unknown as CompleteWorkoutInput
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.cycle(input.cycleId) })
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.sets(input.workoutId) })
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.exerciseHistoryRoot() })
      queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all() })
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() })
    },
  })

  return queryClient
}

const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24

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
  const [supabase] = useState(() => createClient())
  const [authScope, setAuthScope] = useState<string | null>(null)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const previousAuthScopeRef = useRef<string | null>(null)
  const queryClientScope = authScope ?? 'signed-out'
  const queryClient = useMemo(() => makeQueryClient(queryClientScope), [queryClientScope])
  const persister = useMemo(() => {
    return authScope ? createIdbPersister(authScope) : null
  }, [authScope])

  useEffect(() => {
    let isActive = true

    void clearLegacyPersistedQueryCache().catch(() => undefined)

    const applyAuthScope = (nextScope: string | null) => {
      if (!isActive) return

      setIsAuthReady(true)
      setAuthScope((currentScope) => {
        if (currentScope === nextScope) {
          return currentScope
        }

        return nextScope
      })
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
    if (!isAuthReady) {
      return
    }

    const previousScope = previousAuthScopeRef.current
    previousAuthScopeRef.current = authScope

    if (!previousScope || previousScope === authScope) {
      return
    }

    void clearAllPersistedQueryCaches().catch(() => undefined)
    void clearLegacyPersistedQueryCache().catch(() => undefined)
  }, [authScope, isAuthReady])

  const content = (
    <>
      <ThemeSync />
      {children}
    </>
  )

  if (!isAuthReady || !authScope || !persister) {
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
        buster: getQueryPersistenceBuster(authScope),
        maxAge: QUERY_CACHE_MAX_AGE,
      }}
      onSuccess={() => {
        void queryClient.resumePausedMutations()
      }}
    >
      {content}
    </PersistQueryClientProvider>
  )
}
