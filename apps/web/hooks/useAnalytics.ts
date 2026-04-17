'use client'

import { useQuery } from '@tanstack/react-query'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import { parseAnalyticsData } from '@/lib/analytics'
import { formatDateAsLocalIso } from '@/lib/utils'
import { useSupabase } from './useSupabase'

export interface AnalyticsDateRange {
  from: Date
  to: Date
}

export const analyticsQueryKeys = {
  all: () => ['analytics'] as const,
  filtered: (exerciseId: number | null | undefined, dateRange?: AnalyticsDateRange, weightRoundingLbs?: number) => [
    'analytics',
    exerciseId ?? 'all',
    dateRange?.from ? formatDateAsLocalIso(dateRange.from) : 'default',
    dateRange?.to ? formatDateAsLocalIso(dateRange.to) : 'default',
    weightRoundingLbs ?? 'default-rounding',
  ] as const,
}

async function fetchAnalyticsAggregate(
  supabase: ReturnType<typeof useSupabase>,
  exerciseId: number | null | undefined,
  weightRoundingLbs: number,
  dateRange?: AnalyticsDateRange,
) {
  const { data, error } = await supabase.rpc('get_analytics_data', {
    ...(exerciseId ? { p_exercise_id: exerciseId } : {}),
    ...(dateRange?.from ? { p_date_from: formatDateAsLocalIso(dateRange.from) } : {}),
    ...(dateRange?.to ? { p_date_to: formatDateAsLocalIso(dateRange.to) } : {}),
  })

  if (error) throw error

  return parseAnalyticsData(data, weightRoundingLbs)
}

export function useAnalytics(exerciseId?: number | null, dateRange?: AnalyticsDateRange) {
  const supabase = useSupabase()
  const weightRoundingLbs = usePreferredWeightRounding()

  return useQuery({
    queryKey: analyticsQueryKeys.filtered(exerciseId, dateRange, weightRoundingLbs),
    queryFn: async () => fetchAnalyticsAggregate(supabase, exerciseId, weightRoundingLbs, dateRange),
    staleTime: 2 * 60 * 1000,
  })
}
