'use client'

import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { get, set, del } from 'idb-keyval'
import { useState, useEffect } from 'react'
import { useUiStore } from '@/store/uiStore'
import { createClient } from '@/lib/supabase/client'
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

function makeQueryClient() {
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
    },
  })

  queryClient.setMutationDefaults(workoutMutationKeys.completeWorkout(), {
    mutationFn: (variables) => completeWorkoutMutation(supabase, variables as unknown as CompleteWorkoutInput),
    onSuccess: (_data, variables) => {
      const input = variables as unknown as CompleteWorkoutInput
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.cycle(input.cycleId) })
      queryClient.invalidateQueries({ queryKey: workoutQueryKeys.sets(input.workoutId) })
    },
  })

  return queryClient
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
      onSuccess={() => {
        void queryClient.resumePausedMutations()
      }}
    >
      <ThemeSync />
      {children}
    </PersistQueryClientProvider>
  )
}
