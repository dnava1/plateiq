'use client'

import { useQuery } from '@tanstack/react-query'
import { parseAnalyticsData } from '@/lib/analytics'
import { formatDateAsLocalIso } from '@/lib/utils'
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
    dateRange?.from ? formatDateAsLocalIso(dateRange.from) : 'default',
    dateRange?.to ? formatDateAsLocalIso(dateRange.to) : 'default',
  ] as const,
}

async function fetchAnalyticsAggregate(
  supabase: ReturnType<typeof useSupabase>,
  exerciseId: number | null | undefined,
  dateRange?: AnalyticsDateRange,
) {
  const { data, error } = await supabase.rpc('get_analytics_data', {
    ...(exerciseId ? { p_exercise_id: exerciseId } : {}),
    ...(dateRange?.from ? { p_date_from: formatDateAsLocalIso(dateRange.from) } : {}),
    ...(dateRange?.to ? { p_date_to: formatDateAsLocalIso(dateRange.to) } : {}),
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
