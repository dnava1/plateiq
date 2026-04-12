'use client'

import { useQuery } from '@tanstack/react-query'
import { parseAnalyticsData } from '@/lib/analytics'
import { useSupabase } from './useSupabase'

export interface AnalyticsDateRange {
  from: Date
  to: Date
}

export const analyticsQueryKeys = {
  all: () => ['analytics'] as const,
  filtered: (exerciseId: number | null | undefined, dateRange?: AnalyticsDateRange) => [
    'analytics',
    exerciseId ?? 'all',
    dateRange?.from?.toISOString().slice(0, 10) ?? 'default',
    dateRange?.to?.toISOString().slice(0, 10) ?? 'default',
  ] as const,
}

async function fetchAnalyticsAggregate(
  supabase: ReturnType<typeof useSupabase>,
  exerciseId: number | null | undefined,
  dateRange?: AnalyticsDateRange,
) {
  const { data, error } = await supabase.rpc('get_analytics_data', {
    ...(exerciseId ? { p_exercise_id: exerciseId } : {}),
    ...(dateRange?.from ? { p_date_from: dateRange.from.toISOString().slice(0, 10) } : {}),
    ...(dateRange?.to ? { p_date_to: dateRange.to.toISOString().slice(0, 10) } : {}),
  })

  if (error) throw error

  return parseAnalyticsData(data)
}

export function useAnalytics(exerciseId?: number | null, dateRange?: AnalyticsDateRange) {
  const supabase = useSupabase()

  return useQuery({
    queryKey: analyticsQueryKeys.filtered(exerciseId, dateRange),
    queryFn: async () => fetchAnalyticsAggregate(supabase, exerciseId, dateRange),
    staleTime: 2 * 60 * 1000,
  })
}
