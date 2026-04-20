'use client'

import { useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { useAnalytics, type AnalyticsDateRange } from '@/hooks/useAnalytics'
import { useExercises } from '@/hooks/useExercises'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import {
  aggregateWeeklyVolume,
  buildWeeklyActivity,
  createEmptyAnalyticsBodyweightLane,
  createEmptyAnalyticsCoverage,
  deriveRecentPrs,
  describeAnalyticsCoverageReasons,
  formatAnalyticsCoverageFamily,
  hasInsightEligibleAnalyticsData,
  hasRenderableAnalyticsData,
  summarizeAnalyticsCoverageFamilies,
} from '@/lib/analytics'
import { ChartCard } from '@/components/charts/ChartCard'
import { ConsistencyHeatmap } from '@/components/charts/ConsistencyHeatmap'
import { E1rmTrendChart } from '@/components/charts/E1rmTrendChart'
import { MuscleBalanceChart } from '@/components/charts/MuscleBalanceChart'
import { PrTimelineChart } from '@/components/charts/PrTimelineChart'
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
  const coverageFamilies = useMemo(
    () => summarizeAnalyticsCoverageFamilies(analytics.coverage)
      .filter((family) => family.family !== 'training_max'),
    [analytics.coverage],
  )
  const selectedDateRangeLabel = DATE_RANGE_PRESETS.find((preset) => preset.value === rangeKey)?.label ?? 'Last 6 months'
  const selectedExerciseName = selectedExerciseId
    ? exercises?.find((exercise) => exercise.id === selectedExerciseId)?.name ?? null
    : null
  const aiInsightScopeKey = [
    selectedExerciseId ?? 'all',
    formatDateAsLocalIso(dateRange.from),
    formatDateAsLocalIso(dateRange.to),
  ].join(':')
  const hasAnalyticsData = hasRenderableAnalyticsData(analytics)
  const isInsightEligible = hasInsightEligibleAnalyticsData(analytics)
  const shouldShowBodyweightLane = analytics.bodyweightLane.relevant || analytics.coverage.metrics.bodyweightLane.status === 'limited'

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
                <span className="eyebrow">AMRAP PRs</span>
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

        <Card className="surface-panel">
          <CardHeader className="gap-2">
            <CardTitle className="text-base">Method Coverage</CardTitle>
            <CardDescription>
              PlateIQ separates broad logging signal from method-bound metrics and keeps bodyweight work in its own review lane.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0 md:grid-cols-2 xl:grid-cols-4">
            {coverageFamilies.map((family) => (
              <div key={family.family} className="rounded-[22px] border border-border/70 bg-background/45 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{formatAnalyticsCoverageFamily(family.family)}</p>
                  <Badge variant="outline" className={coverageBadgeClassName(family.status)}>
                    {coverageStatusLabel(family.status)}
                  </Badge>
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.06em] text-foreground">{family.signalCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">{describeAnalyticsCoverageReasons(family.reasonCodes)}</p>
              </div>
            ))}
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
                  emptyStateNote={analytics.coverage.metrics.consistency.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analytics.coverage.metrics.consistency.reasonCodes)}
                  headerBadge={<CoverageBadge coverage={analytics.coverage.metrics.consistency} />}
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
                  emptyStateNote={analytics.coverage.metrics.e1rmTrend.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analytics.coverage.metrics.e1rmTrend.reasonCodes)}
                  headerBadge={<CoverageBadge coverage={analytics.coverage.metrics.e1rmTrend} />}
                  isEmpty={analytics.e1rmTrend.length === 0}
                  isLoading={isLoading}
                >
                  <E1rmTrendChart data={analytics.e1rmTrend} exerciseId={selectedExerciseId} />
                </ChartCard>

                <ChartCard
                  title="Muscle Balance"
                  description="Volume distribution by movement pattern in the current filter window."
                  emptyMessage="Logged work sets are required to compare movement balance."
                  emptyStateNote={analytics.coverage.metrics.muscleBalance.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analytics.coverage.metrics.muscleBalance.reasonCodes)}
                  headerBadge={<CoverageBadge coverage={analytics.coverage.metrics.muscleBalance} />}
                  isEmpty={analytics.muscleBalance.length === 0}
                  isLoading={isLoading}
                >
                  <MuscleBalanceChart data={analytics.muscleBalance} />
                </ChartCard>

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

                <ChartCard
                  title="Bodyweight Review"
                  description={selectedExerciseName
                    ? `${selectedExerciseName} bodyweight work keeps strict-rep and added-load signal separate.`
                    : 'Bodyweight work gets its own lane so strict-rep progress and added-load progress do not get flattened into zero-load charts.'}
                  emptyMessage="No bodyweight review data landed in this filter window."
                  emptyStateNote={analytics.coverage.metrics.bodyweightLane.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analytics.coverage.metrics.bodyweightLane.reasonCodes)}
                  headerBadge={<CoverageBadge coverage={analytics.coverage.metrics.bodyweightLane} />}
                  isEmpty={!shouldShowBodyweightLane || analytics.bodyweightLane.exerciseSummaries.length === 0}
                  isLoading={isLoading}
                  className="xl:col-span-2"
                  heightClassName="h-48"
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                    <div className="grid gap-3 md:grid-cols-2">
                      {analytics.bodyweightLane.exerciseSummaries.map((summary) => (
                        <div key={summary.exerciseId} className="rounded-[20px] border border-border/70 bg-background/45 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">{summary.exerciseName}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {summary.lastSessionDate ? `Last logged ${formatDate(summary.lastSessionDate)}` : 'No completed sessions yet'}
                              </p>
                            </div>
                            <Badge variant="outline">{summary.strictSessionCount + summary.weightedSessionCount} sessions</Badge>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div>
                              <span className="eyebrow">Strict Rep Best</span>
                              <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-foreground">
                                {summary.latestStrictRepBest ?? '—'}
                              </p>
                            </div>
                            <div>
                              <span className="eyebrow">Latest Added Load</span>
                              <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-foreground">
                                {summary.latestAddedLoadLbs !== null
                                  ? formatWeight(summary.latestAddedLoadLbs, preferredUnit, weightRoundingLbs)
                                  : '—'}
                              </p>
                            </div>
                          </div>
                          <p className="mt-3 text-xs text-muted-foreground">
                            {summary.strictSessionCount} strict sessions · {summary.weightedSessionCount} weighted sessions
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-3">
                      <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
                        <span className="eyebrow">Strict Rep Trend</span>
                        <div className="mt-3 flex flex-col gap-2">
                          {[...analytics.bodyweightLane.strictRepTrend].slice(-6).reverse().map((point) => (
                            <div key={`${point.exerciseId}-${point.date}`} className="flex items-center justify-between gap-3 text-sm">
                              <div>
                                <p className="font-medium text-foreground">{point.exerciseName}</p>
                                <p className="text-xs text-muted-foreground">{formatDate(point.date)}</p>
                              </div>
                              <p className="font-medium text-foreground">{point.bestReps} reps</p>
                            </div>
                          ))}
                          {analytics.bodyweightLane.strictRepTrend.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No strict bodyweight sessions in this window.</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
                        <span className="eyebrow">Added Load Trend</span>
                        <div className="mt-3 flex flex-col gap-2">
                          {[...analytics.bodyweightLane.weightedLoadTrend].slice(-6).reverse().map((point) => (
                            <div key={`${point.exerciseId}-${point.date}-${point.addedWeightLbs}`} className="flex items-center justify-between gap-3 text-sm">
                              <div>
                                <p className="font-medium text-foreground">{point.exerciseName}</p>
                                <p className="text-xs text-muted-foreground">{formatDate(point.date)} · {point.reps} reps</p>
                              </div>
                              <p className="font-medium text-foreground">{formatWeight(point.addedWeightLbs, preferredUnit, weightRoundingLbs)}</p>
                            </div>
                          ))}
                          {analytics.bodyweightLane.weightedLoadTrend.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No weighted bodyweight sessions in this window.</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
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
                  emptyStateNote={analytics.coverage.metrics.e1rmTrend.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analytics.coverage.metrics.e1rmTrend.reasonCodes)}
                  headerBadge={<CoverageBadge coverage={analytics.coverage.metrics.e1rmTrend} />}
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
                  emptyStateNote={analytics.coverage.metrics.prHistory.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analytics.coverage.metrics.prHistory.reasonCodes)}
                  headerBadge={<CoverageBadge coverage={analytics.coverage.metrics.prHistory} />}
                  isEmpty={analytics.prHistory.length === 0}
                  isLoading={isLoading}
                  className="xl:col-span-2"
                >
                  <PrTimelineChart data={analytics.prHistory} exerciseId={selectedExerciseId} />
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
            </TabsContent>

            <TabsContent value="volume" className="mt-4">
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
                  title="Movement Balance"
                  description="Volume share by movement pattern."
                  emptyMessage="Movement balance appears after enough logged work sets land in this range."
                  emptyStateNote={analytics.coverage.metrics.muscleBalance.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analytics.coverage.metrics.muscleBalance.reasonCodes)}
                  headerBadge={<CoverageBadge coverage={analytics.coverage.metrics.muscleBalance} />}
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
                  emptyStateNote={analytics.coverage.metrics.volumeTrend.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analytics.coverage.metrics.volumeTrend.reasonCodes)}
                  headerBadge={<CoverageBadge coverage={analytics.coverage.metrics.volumeTrend} />}
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
                coverage={analytics.coverage}
                dateRange={dateRange}
                dateRangeLabel={selectedDateRangeLabel}
                hasAnalyticsData={hasAnalyticsData}
                isInsightEligible={isInsightEligible}
                selectedExerciseId={selectedExerciseId}
                selectedExerciseName={selectedExerciseName}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
