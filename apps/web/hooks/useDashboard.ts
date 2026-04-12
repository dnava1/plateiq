'use client'

import { useQuery } from '@tanstack/react-query'
import { parseDashboardData } from '@/lib/analytics'
import { useSupabase } from './useSupabase'

export const dashboardQueryKeys = {
  all: () => ['dashboard'] as const,
}

async function fetchDashboardAggregate(supabase: ReturnType<typeof useSupabase>) {
  const { data, error } = await supabase.rpc('get_dashboard')

  if (error) throw error

  return parseDashboardData(data)
}

export function useDashboard() {
  const supabase = useSupabase()

  return useQuery({
    queryKey: dashboardQueryKeys.all(),
    queryFn: async () => fetchDashboardAggregate(supabase),
    staleTime: 60 * 1000,
  })
}