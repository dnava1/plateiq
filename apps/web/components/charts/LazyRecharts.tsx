'use client'

import { lazy, Suspense } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  AnalyticsBodyweightRepPoint,
  AnalyticsBodyweightWeeklyVolumePoint,
  AnalyticsE1rmPoint,
  AnalyticsMuscleBalancePoint,
  AnalyticsVolumePoint,
} from '@/types/analytics'

interface E1rmTrendChartProps {
  compact?: boolean
  data: AnalyticsE1rmPoint[]
  exerciseId?: number | null
}

interface VolumeTrendChartProps {
  compact?: boolean
  data: AnalyticsVolumePoint[]
  exerciseId?: number | null
}

interface MuscleBalanceChartProps {
  data: AnalyticsMuscleBalancePoint[]
  metricLabel?: string
  name?: string
}

interface BodyweightRepTrendChartProps {
  compact?: boolean
  data: AnalyticsBodyweightRepPoint[]
  exerciseId?: number | null
}

interface BodyweightWeeklyVolumeChartProps {
  compact?: boolean
  data: AnalyticsBodyweightWeeklyVolumePoint[]
}

const E1rmTrendChart = lazy(async () => {
  const mod = await import('@/components/charts/E1rmTrendChart')
  return { default: mod.E1rmTrendChart }
})

const VolumeTrendChart = lazy(async () => {
  const mod = await import('@/components/charts/VolumeTrendChart')
  return { default: mod.VolumeTrendChart }
})

const MuscleBalanceChart = lazy(async () => {
  const mod = await import('@/components/charts/MuscleBalanceChart')
  return { default: mod.MuscleBalanceChart }
})

const BodyweightRepTrendChart = lazy(async () => {
  const mod = await import('@/components/charts/BodyweightRepTrendChart')
  return { default: mod.BodyweightRepTrendChart }
})

const BodyweightWeeklyVolumeChart = lazy(async () => {
  const mod = await import('@/components/charts/BodyweightWeeklyVolumeChart')
  return { default: mod.BodyweightWeeklyVolumeChart }
})

function ChartFallback({ compact = false }: { compact?: boolean }) {
  return (
    <Skeleton
      aria-label="Loading chart"
      className={cn('w-full rounded-[22px]', compact ? 'h-28' : 'h-72')}
    />
  )
}

export function LazyE1rmTrendChart({ compact = false, ...props }: E1rmTrendChartProps) {
  return (
    <Suspense fallback={<ChartFallback compact={compact} />}>
      <E1rmTrendChart compact={compact} {...props} />
    </Suspense>
  )
}

export function LazyVolumeTrendChart({ compact = false, ...props }: VolumeTrendChartProps) {
  return (
    <Suspense fallback={<ChartFallback compact={compact} />}>
      <VolumeTrendChart compact={compact} {...props} />
    </Suspense>
  )
}

export function LazyMuscleBalanceChart(props: MuscleBalanceChartProps) {
  return (
    <Suspense fallback={<ChartFallback />}>
      <MuscleBalanceChart {...props} />
    </Suspense>
  )
}

export function LazyBodyweightRepTrendChart({ compact = false, ...props }: BodyweightRepTrendChartProps) {
  return (
    <Suspense fallback={<ChartFallback compact={compact} />}>
      <BodyweightRepTrendChart compact={compact} {...props} />
    </Suspense>
  )
}

export function LazyBodyweightWeeklyVolumeChart({ compact = false, ...props }: BodyweightWeeklyVolumeChartProps) {
  return (
    <Suspense fallback={<ChartFallback compact={compact} />}>
      <BodyweightWeeklyVolumeChart compact={compact} {...props} />
    </Suspense>
  )
}
