'use client'

import { useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { useAnalytics, type AnalyticsDateRange } from '@/hooks/useAnalytics'
import { useExercises } from '@/hooks/useExercises'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import { aggregateWeeklyVolume, buildWeeklyActivity, deriveRecentPrs, hasAnalyticsData as hasAnalyticsSnapshot } from '@/lib/analytics'
import { ChartCard } from '@/components/charts/ChartCard'
import { ConsistencyHeatmap } from '@/components/charts/ConsistencyHeatmap'
import { E1rmTrendChart } from '@/components/charts/E1rmTrendChart'
import { MuscleBalanceChart } from '@/components/charts/MuscleBalanceChart'
import { PrTimelineChart } from '@/components/charts/PrTimelineChart'
import { TmProgressionChart } from '@/components/charts/TmProgressionChart'
import { VolumeTrendChart } from '@/components/charts/VolumeTrendChart'
import { formatDisplayLoad } from '@/components/charts/chart-utils'
import { AiInsightsPanel } from './AiInsightsPanel'
import { StrengthProfilePanel } from './StrengthProfilePanel'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createEmptyStrengthProfile } from '@/lib/strength-profile'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate, formatDateAsLocalIso, formatWeight } from '@/lib/utils'
import type { AnalyticsData } from '@/types/analytics'

const EMPTY_ANALYTICS: AnalyticsData = {
  e1rmTrend: [],
  volumeTrend: [],
  prHistory: [],
  consistency: {
    totalSessions: 0,
    weeksActive: 0,
    firstSession: null,
    lastSession: null,
  },
  muscleBalance: [],
  stallDetection: [],
  tmProgression: [],
  strengthProfile: createEmptyStrengthProfile(),
}

const DATE_RANGE_PRESETS: Array<{ label: string; value: string; days: number }> = [
  { value: '8w', label: 'Last 8 weeks', days: 56 },
  { value: '12w', label: 'Last 12 weeks', days: 84 },
  { value: '6m', label: 'Last 6 months', days: 183 },
  { value: '12m', label: 'Last 12 months', days: 365 },
]

function createDateRange(rangeKey: string): AnalyticsDateRange {
  const preset = DATE_RANGE_PRESETS.find((entry) => entry.value === rangeKey) ?? DATE_RANGE_PRESETS[2]
  const to = new Date()
  const from = new Date(to)
  from.setDate(to.getDate() - preset.days)
  return { from, to }
}

export function AnalyticsDashboard() {
  const preferredUnit = usePreferredUnit()
  const weightRoundingLbs = usePreferredWeightRounding()
  const [tab, setTab] = useState('overview')
  const [rangeKey, setRangeKey] = useState('6m')
  const [selectedExerciseValue, setSelectedExerciseValue] = useState('all')
  const dateRange = useMemo(() => createDateRange(rangeKey), [rangeKey])
  const selectedExerciseId = selectedExerciseValue === 'all' ? null : Number(selectedExerciseValue)
  const { data: exercises } = useExercises()
  const exerciseSelectItems = useMemo(
    () => [
      { value: 'all', label: 'All exercises' },
      ...(exercises ?? []).map((exercise) => ({
        value: String(exercise.id),
        label: exercise.name,
      })),
    ],
    [exercises],
  )
  const { data, isLoading } = useAnalytics(selectedExerciseId, dateRange)
  const analytics = data
    ? { ...EMPTY_ANALYTICS, ...data }
    : EMPTY_ANALYTICS
  const weeklyActivity = useMemo(() => buildWeeklyActivity(analytics.volumeTrend, 12, dateRange.to), [analytics.volumeTrend, dateRange.to])
  const weeklyVolume = useMemo(() => aggregateWeeklyVolume(analytics.volumeTrend), [analytics.volumeTrend])
  const currentWeekVolume = weeklyVolume.length > 0 ? weeklyVolume[weeklyVolume.length - 1].totalVolume : 0
  const previousWeeks = weeklyVolume.slice(Math.max(0, weeklyVolume.length - 5), weeklyVolume.length - 1)
  const averageWeeklyVolume = previousWeeks.length > 0
    ? previousWeeks.reduce((total, entry) => total + entry.totalVolume, 0) / previousWeeks.length
    : 0
  const recentPrs = useMemo(() => deriveRecentPrs(analytics.prHistory, 6), [analytics.prHistory])
  const selectedDateRangeLabel = DATE_RANGE_PRESETS.find((preset) => preset.value === rangeKey)?.label ?? 'Last 6 months'
  const selectedExerciseName = selectedExerciseId
    ? exercises?.find((exercise) => exercise.id === selectedExerciseId)?.name ?? null
    : null
  const tmProgressionData = useMemo(
    () => selectedExerciseId
      ? analytics.tmProgression
        .filter((entry) => entry.exerciseId === selectedExerciseId)
        .map((entry) => ({
          effectiveDate: entry.effectiveDate,
          weightLbs: entry.weightLbs,
        }))
      : [],
    [analytics.tmProgression, selectedExerciseId],
  )
  const aiInsightScopeKey = [
    selectedExerciseId ?? 'all',
    formatDateAsLocalIso(dateRange.from),
    formatDateAsLocalIso(dateRange.to),
  ].join(':')
  const hasAnalyticsData = hasAnalyticsSnapshot(analytics)

  return (
    <div className="page-shell max-w-6xl">
      <section className="page-header">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Insights</span>
          <div className="flex flex-col gap-2">
            <h1 className="page-title">Analytics</h1>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6">
        <Card className="surface-panel">
          <CardHeader className="gap-2">
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>
              Filter by date range and exercise.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-0 lg:grid-cols-[minmax(0,18rem)_minmax(0,18rem)_1fr] lg:items-end">
            <div className="flex flex-col gap-2">
              <label htmlFor="analytics-range" className="text-sm font-medium text-foreground">Date Range</label>
              <Select value={rangeKey} onValueChange={(value) => value && setRangeKey(value)} items={DATE_RANGE_PRESETS}>
                <SelectTrigger id="analytics-range" className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {DATE_RANGE_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>{preset.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="analytics-exercise" className="text-sm font-medium text-foreground">Exercise</label>
              <Select
                value={selectedExerciseValue}
                onValueChange={(value) => value && setSelectedExerciseValue(value)}
                items={exerciseSelectItems}
              >
                <SelectTrigger id="analytics-exercise" className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {exerciseSelectItems.map((exercise) => (
                      <SelectItem key={exercise.value} value={exercise.value}>{exercise.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="metric-tile flex flex-col gap-1">
                <span className="eyebrow">Sessions</span>
                <p className="text-2xl font-semibold tracking-[-0.06em] text-foreground">{analytics.consistency.totalSessions}</p>
              </div>
              <div className="metric-tile flex flex-col gap-1">
                <span className="eyebrow">Active Weeks</span>
                <p className="text-2xl font-semibold tracking-[-0.06em] text-foreground">{analytics.consistency.weeksActive}</p>
              </div>
              <div className="metric-tile flex flex-col gap-1">
                <span className="eyebrow">Recent PRs</span>
                <p className="text-2xl font-semibold tracking-[-0.06em] text-foreground">{recentPrs.length}</p>
              </div>
              <div className="metric-tile flex flex-col gap-1">
                <span className="eyebrow">Last Session</span>
                <p className="text-sm font-medium text-foreground">
                  {analytics.consistency.lastSession ? formatDate(analytics.consistency.lastSession) : 'No sessions yet'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Tabs value={tab} onValueChange={setTab} className="min-w-0">
            <TabsList className="rounded-2xl border border-border/70 bg-card/72 p-1">
              <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
              <TabsTrigger value="strength" className="rounded-lg">Strength</TabsTrigger>
              <TabsTrigger value="volume" className="rounded-lg">Volume</TabsTrigger>
              <TabsTrigger value="ai" className="rounded-lg">AI Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard
                  title="Consistency Pulse"
                  description={`${analytics.consistency.totalSessions} finished sessions across ${analytics.consistency.weeksActive} active weeks.`}
                  emptyMessage="Finish workouts to build the consistency view."
                  isEmpty={!hasAnalyticsData || analytics.consistency.totalSessions === 0}
                  isLoading={isLoading}
                  className="xl:col-span-2"
                >
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
                        <span className="eyebrow">First Session</span>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {analytics.consistency.firstSession ? formatDate(analytics.consistency.firstSession) : '—'}
                        </p>
                      </div>
                      <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
                        <span className="eyebrow">Last Session</span>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {analytics.consistency.lastSession ? formatDate(analytics.consistency.lastSession) : '—'}
                        </p>
                      </div>
                      <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
                        <span className="eyebrow">Current Window</span>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {selectedDateRangeLabel}
                        </p>
                      </div>
                    </div>
                    <ConsistencyHeatmap data={weeklyActivity} />
                  </div>
                </ChartCard>

                <ChartCard
                  title="Estimated 1RM Trend"
                  description={selectedExerciseName ?? 'Estimated 1RM progression for the currently filtered lifts.'}
                  emptyMessage="AMRAP history is required to plot estimated 1RM trend lines."
                  isEmpty={analytics.e1rmTrend.length === 0}
                  isLoading={isLoading}
                >
                  <E1rmTrendChart data={analytics.e1rmTrend} exerciseId={selectedExerciseId} />
                </ChartCard>

                <ChartCard
                  title="Muscle Balance"
                  description="Volume distribution by movement pattern in the current filter window."
                  emptyMessage="Logged work sets are required to compare movement balance."
                  isEmpty={analytics.muscleBalance.length === 0}
                  isLoading={isLoading}
                >
                  <MuscleBalanceChart data={analytics.muscleBalance} />
                </ChartCard>

                <ChartCard
                  title="Plateau Watch"
                  description="Main lifts that have not produced a fresh PR in the last four weeks."
                  emptyMessage="No plateaus detected in the current snapshot."
                  isEmpty={analytics.stallDetection.length === 0}
                  isLoading={isLoading}
                  className="xl:col-span-2"
                  heightClassName="h-40"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {analytics.stallDetection.map((entry) => (
                      <div key={entry.exerciseId} className="rounded-[20px] border border-border/70 bg-background/45 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{entry.exerciseName}</p>
                            <p className="text-xs text-muted-foreground">Last PR {formatDate(entry.lastPrDate)}</p>
                          </div>
                          <TrendingUp className="text-muted-foreground" />
                        </div>
                        <p className="mt-3 text-lg font-semibold tracking-[-0.05em] text-foreground">
                          {entry.weeksSincePr} weeks
                        </p>
                      </div>
                    ))}
                  </div>
                </ChartCard>
              </div>
            </TabsContent>

            <TabsContent value="strength" className="mt-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <StrengthProfilePanel strengthProfile={analytics.strengthProfile} />

                <ChartCard
                  title="Estimated 1RM Trend"
                  description={selectedExerciseName ?? 'Line-level strength progression from the current filter.'}
                  emptyMessage="AMRAP history is required to render strength trend lines."
                  isEmpty={analytics.e1rmTrend.length === 0}
                  isLoading={isLoading}
                  className="xl:col-span-2"
                >
                  <E1rmTrendChart data={analytics.e1rmTrend} exerciseId={selectedExerciseId} />
                </ChartCard>

                <ChartCard
                  title="PR Timeline"
                  description="Daily best estimated 1RM points for the selected lifts."
                  emptyMessage="PR timeline will appear once the filter has enough AMRAP history."
                  isEmpty={analytics.prHistory.length === 0}
                  isLoading={isLoading}
                  className="xl:col-span-2"
                >
                  <PrTimelineChart data={analytics.prHistory} exerciseId={selectedExerciseId} />
                </ChartCard>

                <ChartCard
                  title="TM Progression"
                  description={selectedExerciseName
                    ? `${selectedExerciseName} training max changes over time.`
                    : 'Choose an exercise filter to inspect training max history.'}
                  emptyMessage={selectedExerciseId
                    ? 'No training max history is available for this exercise yet.'
                    : 'Select an exercise to unlock the training max progression view.'}
                  isEmpty={!selectedExerciseId || tmProgressionData.length === 0}
                  isLoading={isLoading}
                  className="xl:col-span-2"
                >
                  <TmProgressionChart data={tmProgressionData} />
                </ChartCard>

                <ChartCard
                  title="Recent PRs"
                  description="The freshest estimated 1RM highs in the current filter window."
                  emptyMessage="No recent PRs were detected in this filter window."
                  isEmpty={recentPrs.length === 0}
                  isLoading={isLoading}
                  className="xl:col-span-2"
                  heightClassName="h-40"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {recentPrs.map((record) => (
                      <div key={`${record.exerciseId}-${record.date}`} className="rounded-[20px] border border-border/70 bg-background/45 p-4">
                        <p className="text-sm font-medium text-foreground">{record.exerciseName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(record.date)}</p>
                        <p className="mt-3 text-lg font-semibold tracking-[-0.05em] text-foreground">{formatWeight(record.e1rm, preferredUnit, weightRoundingLbs)}</p>
                        <p className="text-xs text-muted-foreground">{formatWeight(record.weight, preferredUnit, weightRoundingLbs)} × {record.reps}</p>
                      </div>
                    ))}
                  </div>
                </ChartCard>
              </div>
            </TabsContent>

            <TabsContent value="volume" className="mt-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard
                  title="Weekly Volume"
                  description={selectedExerciseName ?? 'Logged weekly volume across the current filter window.'}
                  emptyMessage="Logged work sets are required to build the volume chart."
                  isEmpty={analytics.volumeTrend.length === 0}
                  isLoading={isLoading}
                  className="xl:col-span-2"
                >
                  <VolumeTrendChart data={analytics.volumeTrend} exerciseId={selectedExerciseId} />
                </ChartCard>

                <ChartCard
                  title="Movement Balance"
                  description="Volume share by movement pattern."
                  emptyMessage="Movement balance appears after enough logged work sets land in this range."
                  isEmpty={analytics.muscleBalance.length === 0}
                  isLoading={isLoading}
                >
                  <MuscleBalanceChart data={analytics.muscleBalance} />
                </ChartCard>

                <ChartCard
                  title="Volume Pulse"
                  description={averageWeeklyVolume > 0
                    ? `Current week ${formatDisplayLoad(currentWeekVolume, preferredUnit)} vs ${formatDisplayLoad(averageWeeklyVolume, preferredUnit)} trailing average.`
                    : 'Weekly activity for the selected filter window.'}
                  emptyMessage="Weekly activity appears after completed work sets are logged."
                  isEmpty={weeklyActivity.every((entry) => !entry.isActive)}
                  isLoading={isLoading}
                >
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
                        <span className="eyebrow">Current Week</span>
                        <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-foreground">{formatDisplayLoad(currentWeekVolume, preferredUnit)}</p>
                      </div>
                      <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
                        <span className="eyebrow">Trailing Average</span>
                        <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-foreground">{formatDisplayLoad(averageWeeklyVolume, preferredUnit)}</p>
                      </div>
                    </div>
                    <ConsistencyHeatmap data={weeklyActivity} />
                  </div>
                </ChartCard>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="mt-4">
              <AiInsightsPanel
                key={aiInsightScopeKey}
                dateRange={dateRange}
                dateRangeLabel={selectedDateRangeLabel}
                hasAnalyticsData={hasAnalyticsData}
                recentPrCount={recentPrs.length}
                selectedExerciseId={selectedExerciseId}
                selectedExerciseName={selectedExerciseName}
                stallCount={analytics.stallDetection.length}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
