'use client'

import { useMemo, useState } from 'react'
import { useAnalytics, type AnalyticsDateRange } from '@/hooks/useAnalytics'
import { useExercises } from '@/hooks/useExercises'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import {
  aggregateWeeklyVolume,
  buildConsistencyTrendFallback,
  calculateMovementPatternSetBalance,
  buildMovementPatternWeeklySetVolume,
  buildWeeklySessionActivity,
  buildWeeklyActivity,
  calculateMovementPatternSetRatios,
  createEmptyAnalyticsBodyweightLane,
  createEmptyAnalyticsCoverage,
  deriveRecentPrs,
  describeAnalyticsCoverageReasons,
  hasInsightEligibleAnalyticsData,
  hasRenderableAnalyticsData,
} from '@/lib/analytics'
import { ChartCard } from '@/components/charts/ChartCard'
import { BodyweightRepTrendChart } from '@/components/charts/BodyweightRepTrendChart'
import { BodyweightWeeklyVolumeChart } from '@/components/charts/BodyweightWeeklyVolumeChart'
import { ConsistencyHeatmap } from '@/components/charts/ConsistencyHeatmap'
import { E1rmTrendChart } from '@/components/charts/E1rmTrendChart'
import { MuscleBalanceChart } from '@/components/charts/MuscleBalanceChart'
import { MovementPatternSetRatioPanel } from '@/components/charts/MovementPatternSetRatioPanel'
import { MovementPatternSetVolumeHeatmap } from '@/components/charts/MovementPatternSetVolumeHeatmap'
import { VolumeTrendChart } from '@/components/charts/VolumeTrendChart'
import { formatDisplayLoad } from '@/components/charts/chart-utils'
import { AiInsightsPanel } from './AiInsightsPanel'
import { StrengthProfilePanel } from './StrengthProfilePanel'
import { Badge } from '@/components/ui/badge'
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
import type { AnalyticsData, AnalyticsCoverageStatus, AnalyticsMetricCoverage } from '@/types/analytics'

const EMPTY_ANALYTICS: AnalyticsData = {
  bodyweightLane: createEmptyAnalyticsBodyweightLane(),
  consistencyTrend: [],
  coverage: createEmptyAnalyticsCoverage(),
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

function coverageBadgeClassName(status: AnalyticsCoverageStatus) {
  switch (status) {
    case 'ready':
      return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'limited':
      return 'border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-200'
    default:
      return 'border-border/70 bg-background/40 text-muted-foreground'
  }
}

function coverageStatusLabel(status: AnalyticsCoverageStatus) {
  switch (status) {
    case 'ready':
      return 'Ready'
    case 'limited':
      return 'Limited'
    default:
      return 'Not applicable'
  }
}

function CoverageBadge({ coverage }: { coverage: AnalyticsMetricCoverage }) {
  if (coverage.status === 'ready') {
    return null
  }

  return (
    <Badge variant="outline" className={coverageBadgeClassName(coverage.status)}>
      {coverageStatusLabel(coverage.status)}
    </Badge>
  )
}

const DATE_RANGE_PRESETS: Array<{ label: string; value: string; months: number }> = [
  { value: '1m', label: 'Last month', months: 1 },
  { value: '3m', label: 'Last 3 months', months: 3 },
  { value: '6m', label: 'Last 6 months', months: 6 },
  { value: '12m', label: 'Last 12 months', months: 12 },
]

function subtractCalendarMonths(date: Date, months: number) {
  const result = new Date(date)
  const targetMonth = result.getMonth() - months
  const originalDay = result.getDate()

  result.setDate(1)
  result.setMonth(targetMonth)

  const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(originalDay, lastDayOfTargetMonth))

  return result
}

function createDateRange(rangeKey: string): AnalyticsDateRange {
  const preset = DATE_RANGE_PRESETS.find((entry) => entry.value === rangeKey) ?? DATE_RANGE_PRESETS[2]
  const to = new Date()
  const from = subtractCalendarMonths(to, preset.months)
  return { from, to }
}

export function AnalyticsDashboard() {
  const preferredUnit = usePreferredUnit()
  const weightRoundingLbs = usePreferredWeightRounding()
  const [tab, setTab] = useState('overview')
  const [rangeKey, setRangeKey] = useState('6m')
  const [selectedExerciseValue, setSelectedExerciseValue] = useState('all')
  const dateRange = useMemo(() => createDateRange(rangeKey), [rangeKey])
  const parsedSelectedExerciseId = selectedExerciseValue === 'all' ? null : Number(selectedExerciseValue)
  const selectedExerciseId = typeof parsedSelectedExerciseId === 'number' && Number.isFinite(parsedSelectedExerciseId)
    ? parsedSelectedExerciseId
    : null
  const { data: exercises, isLoading: isExercisesLoading } = useExercises()
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
  const isAnalyticsLoading = isLoading || isExercisesLoading
  const consistencyTrend = useMemo(
    () => analytics.consistencyTrend && analytics.consistencyTrend.length > 0
      ? analytics.consistencyTrend
      : buildConsistencyTrendFallback(analytics.volumeTrend, analytics.bodyweightLane.weeklyVolumeTrend),
    [analytics.bodyweightLane.weeklyVolumeTrend, analytics.consistencyTrend, analytics.volumeTrend],
  )
  const consistencyActivity = useMemo(
    () => buildWeeklySessionActivity(consistencyTrend, dateRange.from, dateRange.to),
    [consistencyTrend, dateRange.from, dateRange.to],
  )
  const volumeActivity = useMemo(() => buildWeeklyActivity(analytics.volumeTrend, 12, dateRange.to), [analytics.volumeTrend, dateRange.to])
  const weeklyVolume = useMemo(() => aggregateWeeklyVolume(analytics.volumeTrend), [analytics.volumeTrend])
  const movementPatternSetVolume = useMemo(
    () => buildMovementPatternWeeklySetVolume(analytics.volumeTrend, exercises ?? []),
    [analytics.volumeTrend, exercises],
  )
  const movementPatternSetRatios = useMemo(
    () => calculateMovementPatternSetRatios(movementPatternSetVolume),
    [movementPatternSetVolume],
  )
  const movementPatternSetBalance = useMemo(
    () => calculateMovementPatternSetBalance(movementPatternSetVolume),
    [movementPatternSetVolume],
  )
  const currentWeekVolume = weeklyVolume.length > 0 ? weeklyVolume[weeklyVolume.length - 1].totalVolume : 0
  const previousWeeks = weeklyVolume.slice(Math.max(0, weeklyVolume.length - 5), weeklyVolume.length - 1)
  const averageWeeklyVolume = previousWeeks.length > 0
    ? previousWeeks.reduce((total, entry) => total + entry.totalVolume, 0) / previousWeeks.length
    : 0
  const recentPrs = useMemo(() => deriveRecentPrs(analytics.prHistory, 6), [analytics.prHistory])
  const selectedDateRangeLabel = DATE_RANGE_PRESETS.find((preset) => preset.value === rangeKey)?.label ?? 'Last 6 months'
  const selectedExercise = useMemo(
    () => (selectedExerciseId ? exercises?.find((exercise) => exercise.id === selectedExerciseId) ?? null : null),
    [exercises, selectedExerciseId],
  )
  const selectedExerciseName = selectedExercise?.name ?? null
  const aiInsightScopeKey = [
    selectedExerciseId ?? 'all',
    formatDateAsLocalIso(dateRange.from),
    formatDateAsLocalIso(dateRange.to),
  ].join(':')
  const hasAnalyticsData = hasRenderableAnalyticsData(analytics)
  const isInsightEligible = hasInsightEligibleAnalyticsData(analytics)
  const hasBodyweightLaneSignals = analytics.bodyweightLane.relevant
    || analytics.coverage.metrics.bodyweightLane.signalCount > 0
  const shouldRenderBodyweightLane = selectedExerciseId === null
    || selectedExercise?.analytics_track === 'bodyweight_review'
    || (selectedExercise === null && hasBodyweightLaneSignals)
  const shouldShowBodyweightLane = hasBodyweightLaneSignals || analytics.coverage.metrics.bodyweightLane.status === 'limited'

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
                <span className="eyebrow">First Session</span>
                <p className="text-sm font-medium text-foreground">
                  {analytics.consistency.firstSession ? formatDate(analytics.consistency.firstSession) : 'No sessions yet'}
                </p>
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
            <TabsList className="max-w-full justify-start overflow-x-auto rounded-2xl border border-border/70 bg-card/72 p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <TabsTrigger value="overview" className="shrink-0 rounded-lg">Overview</TabsTrigger>
              <TabsTrigger value="strength" className="shrink-0 rounded-lg">Strength</TabsTrigger>
              <TabsTrigger value="volume" className="shrink-0 rounded-lg">Volume</TabsTrigger>
              <TabsTrigger value="ai" className="shrink-0 rounded-lg">AI Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              {tab === 'overview' ? (
                <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard
                  title="Consistency Pulse"
                  description={`${analytics.consistency.totalSessions} finished sessions across ${analytics.consistency.weeksActive} active weeks.`}
                  emptyMessage="Finish workouts to build the consistency view."
                  emptyStateNote={analytics.coverage.metrics.consistency.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analytics.coverage.metrics.consistency.reasonCodes)}
                  headerBadge={<CoverageBadge coverage={analytics.coverage.metrics.consistency} />}
                  isEmpty={!hasAnalyticsData || analytics.consistency.totalSessions === 0}
                  isLoading={isLoading}
                  className="min-w-0 xl:col-span-2"
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
                    <ConsistencyHeatmap data={consistencyActivity} metric="sessions" />
                  </div>
                </ChartCard>

                <ChartCard
                  title="Estimated 1RM Trend"
                  description={selectedExerciseName ?? 'Estimated 1RM progression for the currently filtered lifts.'}
                  emptyMessage="Comparable loaded-strength history is required to plot estimated 1RM trend lines."
                  emptyStateNote={analytics.coverage.metrics.e1rmTrend.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analytics.coverage.metrics.e1rmTrend.reasonCodes)}
                  headerBadge={<CoverageBadge coverage={analytics.coverage.metrics.e1rmTrend} />}
                  isEmpty={analytics.e1rmTrend.length === 0}
                  isLoading={isLoading}
                >
                  <E1rmTrendChart data={analytics.e1rmTrend} exerciseId={selectedExerciseId} />
                </ChartCard>

                <ChartCard
                  title="Movement Balance"
                  description="Set share by movement pattern in the current filter window."
                  emptyMessage="Logged work sets are required to compare movement balance."
                  emptyStateNote={analytics.coverage.metrics.volumeTrend.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analytics.coverage.metrics.volumeTrend.reasonCodes)}
                  headerBadge={<CoverageBadge coverage={analytics.coverage.metrics.volumeTrend} />}
                  isEmpty={movementPatternSetBalance.length === 0}
                  isLoading={isAnalyticsLoading}
                >
                  <MuscleBalanceChart data={movementPatternSetBalance} />
                </ChartCard>

                {shouldRenderBodyweightLane ? (
                  <ChartCard
                    title="Bodyweight Exercise Review"
                    description={selectedExerciseName
                      ? `${selectedExerciseName} bodyweight review work is shown through session rep trends and weekly rep volume.`
                      : 'Strict bodyweight movements get full rep-trend and weekly-volume charts, separate from loaded strength analytics.'}
                    emptyMessage="No bodyweight exercise review data landed in this filter window."
                    emptyStateNote={analytics.coverage.metrics.bodyweightLane.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analytics.coverage.metrics.bodyweightLane.reasonCodes)}
                    headerBadge={<CoverageBadge coverage={analytics.coverage.metrics.bodyweightLane} />}
                    isEmpty={!shouldShowBodyweightLane || (analytics.bodyweightLane.exerciseSummaries.length === 0 && analytics.bodyweightLane.repTrend.length === 0)}
                    isLoading={isLoading}
                    className="xl:col-span-2"
                    heightClassName="h-auto"
                  >
                    <div className="grid gap-4 xl:grid-cols-2">
                    <div className="grid gap-3 md:grid-cols-2 xl:col-span-2">
                      {analytics.bodyweightLane.exerciseSummaries.map((summary) => (
                        <div key={summary.exerciseId} className="rounded-[20px] border border-border/70 bg-background/45 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">{summary.exerciseName}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {summary.lastSessionDate ? `Last logged ${formatDate(summary.lastSessionDate)}` : 'No completed sessions yet'}
                              </p>
                            </div>
                            <Badge variant="outline">{summary.strictSessionCount} sessions</Badge>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div>
                              <span className="eyebrow">Last Session Rep Best</span>
                              <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-foreground">
                                {summary.latestStrictRepBest ?? '—'}
                              </p>
                            </div>
                            <div>
                              <span className="eyebrow">Total Logged Reps</span>
                              <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-foreground">
                                {summary.totalLoggedReps}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="min-w-0 rounded-[20px] border border-border/70 bg-background/45 p-4 md:p-5">
                      <div className="flex flex-col gap-1">
                        <span className="eyebrow">Rep Best Trend</span>
                        <p className="text-sm text-muted-foreground">
                          Track the top strict-rep set from each logged session.
                        </p>
                      </div>
                      <div className="mt-4 min-w-0">
                        <BodyweightRepTrendChart
                          data={analytics.bodyweightLane.repTrend}
                          exerciseId={selectedExerciseId}
                        />
                      </div>
                    </div>

                    <div className="min-w-0 rounded-[20px] border border-border/70 bg-background/45 p-4 md:p-5">
                      <div className="flex flex-col gap-1">
                        <span className="eyebrow">Weekly Rep Volume</span>
                        <p className="text-sm text-muted-foreground">
                          See how much strict bodyweight work accumulated each week and how often it showed up.
                        </p>
                      </div>
                      <div className="mt-4 min-w-0">
                        <BodyweightWeeklyVolumeChart data={analytics.bodyweightLane.weeklyVolumeTrend} />
                      </div>
                    </div>
                    </div>
                  </ChartCard>
                ) : null}

                <ChartCard
                  title="Plateau Watch"
                  description="Main lifts that have not produced a fresh PR in the last four weeks."
                  emptyMessage="No plateaus detected in the current snapshot."
                  emptyStateNote={analytics.coverage.metrics.stallDetection.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analytics.coverage.metrics.stallDetection.reasonCodes)}
                  headerBadge={<CoverageBadge coverage={analytics.coverage.metrics.stallDetection} />}
                  isEmpty={analytics.stallDetection.length === 0}
                  isLoading={isLoading}
                  className="xl:col-span-2"
                  heightClassName="h-40"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {analytics.stallDetection.map((entry) => (
                      <div key={entry.exerciseId} className="rounded-[20px] border border-border/70 bg-background/45 p-4">
                        <div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{entry.exerciseName}</p>
                            <p className="text-xs text-muted-foreground">Last PR {formatDate(entry.lastPrDate)}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-lg font-semibold tracking-[-0.05em] text-foreground">
                          {entry.weeksSincePr} weeks
                        </p>
                      </div>
                    ))}
                  </div>
                </ChartCard>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="strength" className="mt-4">
              {tab === 'strength' ? (
                <div className="grid gap-4 xl:grid-cols-2">
                <StrengthProfilePanel strengthProfile={analytics.strengthProfile} />

                <ChartCard
                  title="Estimated 1RM Trend"
                  description={selectedExerciseName ?? 'Line-level strength progression from the current filter.'}
                  emptyMessage="Comparable loaded-strength history is required to render strength trend lines."
                  emptyStateNote={analytics.coverage.metrics.e1rmTrend.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analytics.coverage.metrics.e1rmTrend.reasonCodes)}
                  headerBadge={<CoverageBadge coverage={analytics.coverage.metrics.e1rmTrend} />}
                  isEmpty={analytics.e1rmTrend.length === 0}
                  isLoading={isLoading}
                  className="xl:col-span-2"
                >
                  <E1rmTrendChart data={analytics.e1rmTrend} exerciseId={selectedExerciseId} />
                </ChartCard>

                <ChartCard
                  title="Recent PRs"
                  description="The freshest estimated 1RM highs in the current filter window."
                  emptyMessage="No recent PRs were detected in this filter window."
                  emptyStateNote={analytics.coverage.metrics.prHistory.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analytics.coverage.metrics.prHistory.reasonCodes)}
                  headerBadge={<CoverageBadge coverage={analytics.coverage.metrics.prHistory} />}
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
              ) : null}
            </TabsContent>

            <TabsContent value="volume" className="mt-4">
              {tab === 'volume' ? (
                <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard
                  title="Weekly Volume"
                  description={selectedExerciseName ?? 'Logged weekly volume across the current filter window.'}
                  emptyMessage="Logged work sets are required to build the volume chart."
                  emptyStateNote={analytics.coverage.metrics.volumeTrend.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analytics.coverage.metrics.volumeTrend.reasonCodes)}
                  headerBadge={<CoverageBadge coverage={analytics.coverage.metrics.volumeTrend} />}
                  isEmpty={analytics.volumeTrend.length === 0}
                  isLoading={isLoading}
                  className="xl:col-span-2"
                >
                  <VolumeTrendChart data={analytics.volumeTrend} exerciseId={selectedExerciseId} />
                </ChartCard>

                <ChartCard
                  title="Movement Pattern Set Volume"
                  description="Weekly work sets grouped by the primary movement patterns used in movement balance."
                  emptyMessage="Logged work sets with movement patterns are required to build this heatmap."
                  emptyStateNote={analytics.coverage.metrics.volumeTrend.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analytics.coverage.metrics.volumeTrend.reasonCodes)}
                  headerBadge={<CoverageBadge coverage={analytics.coverage.metrics.volumeTrend} />}
                  isEmpty={movementPatternSetVolume.length === 0}
                  isLoading={isAnalyticsLoading}
                  className="min-w-0 xl:col-span-2"
                  heightClassName="h-72"
                >
                  <div className="flex min-w-0 flex-col gap-4">
                    <MovementPatternSetRatioPanel ratios={movementPatternSetRatios} />
                    <MovementPatternSetVolumeHeatmap
                      data={movementPatternSetVolume}
                      dateFrom={dateRange.from}
                      dateTo={dateRange.to}
                    />
                  </div>
                </ChartCard>

                <ChartCard
                  title="Movement Balance"
                  description="Set share by movement pattern."
                  emptyMessage="Movement balance appears after enough logged work sets land in this range."
                  emptyStateNote={analytics.coverage.metrics.volumeTrend.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analytics.coverage.metrics.volumeTrend.reasonCodes)}
                  headerBadge={<CoverageBadge coverage={analytics.coverage.metrics.volumeTrend} />}
                  isEmpty={movementPatternSetBalance.length === 0}
                  isLoading={isAnalyticsLoading}
                >
                  <MuscleBalanceChart data={movementPatternSetBalance} />
                </ChartCard>

                <ChartCard
                  title="Volume Pulse"
                  description={averageWeeklyVolume > 0
                    ? `Current week ${formatDisplayLoad(currentWeekVolume, preferredUnit)} vs ${formatDisplayLoad(averageWeeklyVolume, preferredUnit)} trailing average.`
                    : 'Weekly activity for the selected filter window.'}
                  emptyMessage="Weekly activity appears after completed work sets are logged."
                  emptyStateNote={analytics.coverage.metrics.volumeTrend.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analytics.coverage.metrics.volumeTrend.reasonCodes)}
                  headerBadge={<CoverageBadge coverage={analytics.coverage.metrics.volumeTrend} />}
                  isEmpty={volumeActivity.every((entry) => !entry.isActive)}
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
                    <ConsistencyHeatmap data={volumeActivity} />
                  </div>
                </ChartCard>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="ai" className="mt-4">
              {tab === 'ai' ? (
                <AiInsightsPanel
                  key={aiInsightScopeKey}
                  coverage={analytics.coverage}
                  dateRange={dateRange}
                  dateRangeLabel={selectedDateRangeLabel}
                  hasAnalyticsData={hasAnalyticsData}
                  isInsightEligible={isInsightEligible}
                  selectedExerciseId={selectedExerciseId}
                  selectedExerciseName={selectedExerciseName}
                />
              ) : null}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
