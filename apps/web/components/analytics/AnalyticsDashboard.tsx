'use client'

import { useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { useAnalytics, type AnalyticsDateRange } from '@/hooks/useAnalytics'
import { useExercises } from '@/hooks/useExercises'
import { aggregateWeeklyVolume, buildWeeklyActivity, deriveRecentPrs } from '@/lib/analytics'
import { ChartCard } from '@/components/charts/ChartCard'
import { ConsistencyHeatmap } from '@/components/charts/ConsistencyHeatmap'
import { E1rmTrendChart } from '@/components/charts/E1rmTrendChart'
import { MuscleBalanceChart } from '@/components/charts/MuscleBalanceChart'
import { PrTimelineChart } from '@/components/charts/PrTimelineChart'
import { TmProgressionChart } from '@/components/charts/TmProgressionChart'
import { VolumeTrendChart } from '@/components/charts/VolumeTrendChart'
import { PlateCalculator } from './PlateCalculator'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate } from '@/lib/utils'
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
  const analytics = data ?? EMPTY_ANALYTICS
  const weeklyActivity = useMemo(() => buildWeeklyActivity(analytics.volumeTrend, 12, dateRange.to), [analytics.volumeTrend, dateRange.to])
  const weeklyVolume = useMemo(() => aggregateWeeklyVolume(analytics.volumeTrend), [analytics.volumeTrend])
  const currentWeekVolume = weeklyVolume.length > 0 ? weeklyVolume[weeklyVolume.length - 1].totalVolume : 0
  const previousWeeks = weeklyVolume.slice(Math.max(0, weeklyVolume.length - 5), weeklyVolume.length - 1)
  const averageWeeklyVolume = previousWeeks.length > 0
    ? previousWeeks.reduce((total, entry) => total + entry.totalVolume, 0) / previousWeeks.length
    : 0
  const recentPrs = useMemo(() => deriveRecentPrs(analytics.prHistory, 6), [analytics.prHistory])
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
  const hasAnalyticsData = analytics.e1rmTrend.length > 0
    || analytics.volumeTrend.length > 0
    || analytics.prHistory.length > 0
    || analytics.muscleBalance.length > 0
    || analytics.stallDetection.length > 0
    || analytics.consistency.totalSessions > 0

  return (
    <div className="page-shell max-w-6xl">
      <section className="page-header">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Insights</span>
          <div className="flex flex-col gap-2">
            <h1 className="page-title">Analytics</h1>
            <p className="page-copy">
              Filter the training history, inspect trend lines, and load the bar from the same analytics snapshot.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6">
        <Card className="surface-panel">
          <CardHeader className="gap-2">
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>
              Narrow the analytics snapshot by date window and exercise without leaving the page.
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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
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
                          {DATE_RANGE_PRESETS.find((preset) => preset.value === rangeKey)?.label ?? 'Last 6 months'}
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
                  title="Stall Watch"
                  description="Main lifts that have not produced a fresh PR in the last four weeks."
                  emptyMessage="No stalls detected in the current snapshot."
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
                        <p className="mt-3 text-lg font-semibold tracking-[-0.05em] text-foreground">{record.e1rm.toFixed(1)} lbs</p>
                        <p className="text-xs text-muted-foreground">{record.weight} lbs × {record.reps}</p>
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
                    ? `Current week ${Math.round(currentWeekVolume)} lbs vs ${Math.round(averageWeeklyVolume)} lbs trailing average.`
                    : 'Weekly activity for the selected filter window.'}
                  emptyMessage="Weekly activity appears after completed work sets are logged."
                  isEmpty={weeklyActivity.every((entry) => !entry.isActive)}
                  isLoading={isLoading}
                >
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
                        <span className="eyebrow">Current Week</span>
                        <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-foreground">{Math.round(currentWeekVolume)} lbs</p>
                      </div>
                      <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
                        <span className="eyebrow">Trailing Average</span>
                        <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-foreground">{Math.round(averageWeeklyVolume)} lbs</p>
                      </div>
                    </div>
                    <ConsistencyHeatmap data={weeklyActivity} />
                  </div>
                </ChartCard>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="mt-4">
              <Card className="surface-panel">
                <CardHeader className="gap-2">
                  <CardTitle className="text-base">AI Insights</CardTitle>
                  <CardDescription>
                    The analytics snapshot is in place; structured coaching summaries can layer on top once the generator is enabled.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 pt-0 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <div className="rounded-[22px] border border-border/70 bg-background/45 p-4">
                    <p className="text-sm leading-6 text-muted-foreground">
                      {hasAnalyticsData
                        ? 'This athlete snapshot already includes the trend, consistency, PR, and stall signals the insight generator will consume. Use the chart tabs to review the raw picture until automated summaries are switched on.'
                        : 'Build a little more training history first. The insight generator depends on the same analytics snapshot shown in the Overview, Strength, and Volume tabs.'}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
                      <span className="eyebrow">Snapshot Ready</span>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-foreground">{hasAnalyticsData ? 'Yes' : 'Not yet'}</p>
                    </div>
                    <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
                      <span className="eyebrow">PR Signals</span>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-foreground">{recentPrs.length}</p>
                    </div>
                    <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
                      <span className="eyebrow">Stalls Flagged</span>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-foreground">{analytics.stallDetection.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <PlateCalculator analytics={analytics} exerciseId={selectedExerciseId} exerciseName={selectedExerciseName} />
        </div>
      </div>
    </div>
  )
}
