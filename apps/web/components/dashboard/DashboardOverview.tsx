'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Activity, ArrowRight, Dumbbell, PlusIcon, TrendingUp } from 'lucide-react'
import { useAnalytics, type AnalyticsDateRange } from '@/hooks/useAnalytics'
import { useDashboard } from '@/hooks/useDashboard'
import { useActiveProgram } from '@/hooks/usePrograms'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { resolveWorkoutProgram, useActiveCycle, useCycleWorkouts } from '@/hooks/useWorkouts'
import {
  aggregateWeeklyVolume,
  buildConsistencyTrendFallback,
  buildWeeklySessionActivity,
  createEmptyAnalyticsBodyweightLane,
  createEmptyAnalyticsCoverage,
  describeAnalyticsCoverageReasons,
  deriveRecentPrs,
} from '@/lib/analytics'
import { resolveProgramDay } from '@/lib/programs/week'
import { calculateCycleProgress, findSuggestedWorkoutSelection } from '@/lib/workout-progress'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartCard } from '@/components/charts/ChartCard'
import { ConsistencyHeatmap } from '@/components/charts/ConsistencyHeatmap'
import { LazyE1rmTrendChart, LazyVolumeTrendChart } from '@/components/charts/LazyRecharts'
import { formatDisplayLoad } from '@/components/charts/chart-utils'
import { formatDate, formatDaysPerWeek, formatWeight, formatWeekCycle } from '@/lib/utils'
import type { Json } from '@/types/database'
import type { AnalyticsCoverageStatus, AnalyticsMetricCoverage } from '@/types/analytics'

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

interface ProgramConfig {
  variation_key?: string | null
}

function parseProgramConfig(config: Json | null): ProgramConfig {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return {}
  }

  return config as ProgramConfig
}

export function DashboardOverview() {
  const preferredUnit = usePreferredUnit()
  const weightRoundingLbs = usePreferredWeightRounding()
  const { data: program, isLoading: isProgramLoading } = useActiveProgram()
  const { data: dashboard, isLoading: isDashboardLoading } = useDashboard()
  const { data: activeCycle, isLoading: isCycleLoading } = useActiveCycle(program?.id)
  const { template, isCustom } = useMemo(
    () => resolveWorkoutProgram(program, weightRoundingLbs, activeCycle),
    [activeCycle, program, weightRoundingLbs],
  )
  const { data: cycleWorkouts } = useCycleWorkouts(activeCycle?.id)
  const analyticsRange = useMemo<AnalyticsDateRange>(() => {
    const to = new Date()
    const from = new Date(to)
    from.setDate(to.getDate() - 84)
    return { from, to }
  }, [])
  const { data: analytics, isLoading: isAnalyticsLoading } = useAnalytics(undefined, analyticsRange)
  const analyticsSnapshot = analytics
    ? {
        ...analytics,
        bodyweightLane: analytics.bodyweightLane ?? createEmptyAnalyticsBodyweightLane(),
        coverage: analytics.coverage ?? createEmptyAnalyticsCoverage(),
      }
    : null

  const config = parseProgramConfig(activeCycle?.config ?? program?.config ?? null)
  const variationName = config.variation_key && template?.variation_options
    ? template.variation_options.find((variation) => variation.key === config.variation_key)?.name
    : null
  const summaryParts = [
    template ? formatDaysPerWeek(template.days_per_week) : null,
    template ? formatWeekCycle(template.cycle_length_weeks) : null,
    variationName,
  ].filter(Boolean)
  const cycleProgress = useMemo(
    () => calculateCycleProgress(template ?? undefined, cycleWorkouts),
    [cycleWorkouts, template],
  )
  const suggestedWorkout = useMemo(
    () => findSuggestedWorkoutSelection(template ?? undefined, cycleWorkouts),
    [cycleWorkouts, template],
  )
  const cycleIsComplete = cycleProgress.totalPlannedWorkouts > 0 && cycleProgress.remainingWorkouts === 0
  const nextWorkoutLabel = cycleIsComplete
    ? 'Cycle ready to wrap'
    : (template ? resolveProgramDay(template, suggestedWorkout.dayIndex, suggestedWorkout.weekNumber)?.label : null) ?? 'Next workout'
  const recentPrs = useMemo(() => deriveRecentPrs(analyticsSnapshot?.prHistory ?? [], 4), [analyticsSnapshot?.prHistory])
  const bodyweightSummaries = analyticsSnapshot?.bodyweightLane.exerciseSummaries ?? []
  const consistencyTrend = analyticsSnapshot?.consistencyTrend && analyticsSnapshot.consistencyTrend.length > 0
    ? analyticsSnapshot.consistencyTrend
    : buildConsistencyTrendFallback(
        analyticsSnapshot?.volumeTrend ?? [],
        analyticsSnapshot?.bodyweightLane.weeklyVolumeTrend ?? [],
      )
  const weeklyActivity = useMemo(
    () => buildWeeklySessionActivity(consistencyTrend, analyticsRange.from, analyticsRange.to).slice(-8),
    [analyticsRange.from, analyticsRange.to, consistencyTrend],
  )
  const weeklyVolume = useMemo(() => aggregateWeeklyVolume(analyticsSnapshot?.volumeTrend ?? []), [analyticsSnapshot?.volumeTrend])
  const currentWeekVolume = weeklyVolume.length > 0 ? weeklyVolume[weeklyVolume.length - 1].totalVolume : 0
  const priorWeeks = weeklyVolume.slice(Math.max(0, weeklyVolume.length - 5), weeklyVolume.length - 1)
  const rollingAverageVolume = priorWeeks.length > 0
    ? priorWeeks.reduce((total, entry) => total + entry.totalVolume, 0) / priorWeeks.length
    : 0
  const currentTms = useMemo(
    () => [...(dashboard?.currentTms ?? [])].sort((left, right) => left.exerciseName.localeCompare(right.exerciseName)),
    [dashboard?.currentTms],
  )
  const recentWorkouts = dashboard?.recentWorkouts ?? []
  const lastCompletedWorkout = recentWorkouts.find((workout) => workout.completedAt) ?? null
  const areSecondaryQueriesLoading = isDashboardLoading || isAnalyticsLoading || isCycleLoading

  if (isProgramLoading) {
    return (
      <div className="page-shell max-w-6xl">
        <section className="page-header">
          <div className="flex flex-col gap-3">
            <span className="eyebrow">Overview</span>
            <div className="flex flex-col gap-2">
              <h1 className="page-title">Dashboard</h1>
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex flex-col gap-4">
            <Card className="surface-panel">
              <CardContent className="flex flex-col gap-4 pt-5">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-4 w-72" />
              </CardContent>
            </Card>
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <Card key={index} className="surface-panel">
                  <CardContent className="flex flex-col gap-3 pt-5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <Card className="surface-panel">
              <CardContent className="flex flex-col gap-3 pt-5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-24 w-full rounded-[22px]" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!program || !template) {
    return (
      <div className="page-shell max-w-6xl">
        <section className="page-header">
          <div className="flex flex-col gap-3">
            <span className="eyebrow">Overview</span>
            <div className="flex flex-col gap-2">
              <h1 className="page-title">Dashboard</h1>
            </div>
          </div>
        </section>

        <Card className="surface-panel">
          <CardContent className="pt-4">
            <Empty className="border-border/70 bg-background/40 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Dumbbell />
                </EmptyMedia>
                <EmptyTitle>No active program yet</EmptyTitle>
                <EmptyDescription>
                  Start with a built-in template or build a custom program from scratch.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Link href="/programs" className={buttonVariants({ variant: 'default' })}>
                  <PlusIcon data-icon="inline-start" />
                  Start a Program
                </Link>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="page-shell max-w-6xl">
      <section className="page-header">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Overview</span>
          <div className="flex flex-col gap-2">
            <h1 className="page-title">Dashboard</h1>
            <p className="page-copy">
              Track current state across the active program and see what needs attention next.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="flex flex-col gap-4">
          <Card className="surface-panel">
            <CardHeader className="gap-4">
              <div className="flex items-start gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Activity />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-xl">{program.name}</CardTitle>
                    <Badge>Active</Badge>
                    {isCustom ? <Badge variant="outline">Custom</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{summaryParts.join(' · ')}</p>
                </div>
              </div>
              <CardAction className="row-span-1">
                <Link href="/programs" className={buttonVariants({ variant: 'outline' })}>
                  Manage
                </Link>
              </CardAction>
            </CardHeader>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="surface-panel">
              <CardHeader className="gap-2">
                <CardTitle className="text-base">Next Workout</CardTitle>
                <CardDescription>
                  {cycleIsComplete
                    ? 'All planned sessions are logged. Review the cycle and roll forward when ready.'
                    : `Week ${suggestedWorkout.weekNumber} · ${nextWorkoutLabel}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-0">
                <p className="text-3xl font-semibold tracking-[-0.08em] text-foreground">
                  {cycleIsComplete ? 'Cycle complete' : nextWorkoutLabel}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {activeCycle ? <Badge variant="outline">Cycle {activeCycle.cycle_number}</Badge> : null}
                  {!cycleIsComplete ? <Badge variant="outline">Week {suggestedWorkout.weekNumber}</Badge> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {lastCompletedWorkout?.completedAt ? (
                    <span>Last finished {formatDate(lastCompletedWorkout.completedAt)}</span>
                  ) : (
                    <span>No completed workouts yet for this block.</span>
                  )}
                </div>
                <Link href={cycleIsComplete ? '/programs' : '/workouts'} className={buttonVariants({ variant: 'default' })}>
                  {cycleIsComplete ? 'Review cycle' : 'Open workouts'}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </CardContent>
            </Card>

            <Card className="surface-panel">
              <CardHeader className="gap-2">
                <CardTitle className="text-base">Cycle Progress</CardTitle>
                <CardDescription>
                  {cycleProgress.completedWorkouts} of {cycleProgress.totalPlannedWorkouts} sessions complete.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-0">
                <div>
                  <p className="text-3xl font-semibold tracking-[-0.08em] text-foreground">
                    {Math.round(cycleProgress.completionRatio * 100)}%
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {cycleProgress.remainingWorkouts > 0
                      ? `${cycleProgress.remainingWorkouts} sessions still open in this block.`
                      : 'Every planned workout in this block has been logged.'}
                  </p>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted/70">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${Math.round(cycleProgress.completionRatio * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{formatWeekCycle(template.cycle_length_weeks)}</span>
                  <span>{formatDaysPerWeek(template.days_per_week)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="surface-panel">
            <CardHeader className="gap-2">
              <CardTitle className="text-base">Current Training Maxes</CardTitle>
              <CardDescription>
                Supporting context for TM-driven programs. Manage setup and checkpoint updates in Programs, or confirm day-of values in Workouts.
              </CardDescription>
              <CardAction>
                <Link href="/programs" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                  Manage in Programs
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="pt-0">
              {isDashboardLoading ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="rounded-[22px] border border-border/70 bg-background/45 p-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="mt-3 h-8 w-28" />
                    </div>
                  ))}
                </div>
              ) : currentTms.length === 0 ? (
                <div className="rounded-[22px] border border-border/70 bg-background/45 px-4 py-5 text-sm text-muted-foreground">
                  Add training maxes for TM-driven lifts when your program needs them. Otherwise this panel can stay empty while dashboard context remains generic.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {currentTms.map((trainingMax) => (
                    <div key={trainingMax.exerciseId} className="rounded-[22px] border border-border/70 bg-background/45 p-4">
                      <p className="text-sm font-medium text-foreground">{trainingMax.exerciseName}</p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.07em] text-foreground">
                        {formatWeight(trainingMax.weightLbs, preferredUnit, weightRoundingLbs)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Effective {formatDate(trainingMax.effectiveDate)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-3">
            <ChartCard
              title="Strength Trend"
              description="Recent estimated 1RM movement from logged loaded-strength work."
              emptyMessage="Log loaded-strength work to light up the strength trend."
              emptyStateNote={analyticsSnapshot?.coverage.metrics.e1rmTrend.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analyticsSnapshot?.coverage.metrics.e1rmTrend.reasonCodes ?? [])}
              headerBadge={analyticsSnapshot ? <CoverageBadge coverage={analyticsSnapshot.coverage.metrics.e1rmTrend} /> : null}
              isEmpty={(analyticsSnapshot?.e1rmTrend.length ?? 0) === 0}
              isLoading={isAnalyticsLoading}
              heightClassName="h-28"
            >
              <LazyE1rmTrendChart compact data={analyticsSnapshot?.e1rmTrend ?? []} />
            </ChartCard>

            <ChartCard
              title="Volume Pace"
              description={rollingAverageVolume > 0
                ? `This week ${formatDisplayLoad(currentWeekVolume, preferredUnit)} vs ${formatDisplayLoad(rollingAverageVolume, preferredUnit)} recent average.`
                : 'Weekly logged volume across all exercises.'}
              emptyMessage="Log completed work sets to compare weekly volume."
              emptyStateNote={analyticsSnapshot?.coverage.metrics.volumeTrend.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analyticsSnapshot?.coverage.metrics.volumeTrend.reasonCodes ?? [])}
              headerBadge={analyticsSnapshot ? <CoverageBadge coverage={analyticsSnapshot.coverage.metrics.volumeTrend} /> : null}
              isEmpty={(analyticsSnapshot?.volumeTrend.length ?? 0) === 0}
              isLoading={isAnalyticsLoading}
              heightClassName="h-28"
            >
              <LazyVolumeTrendChart compact data={analyticsSnapshot?.volumeTrend ?? []} />
            </ChartCard>

            <ChartCard
              title="Consistency"
              description={`${analyticsSnapshot?.consistency.totalSessions ?? 0} sessions over ${analyticsSnapshot?.consistency.weeksActive ?? 0} active weeks.`}
              emptyMessage="Finish workouts to build a weekly consistency trail."
              emptyStateNote={analyticsSnapshot?.coverage.metrics.consistency.status === 'ready' ? undefined : describeAnalyticsCoverageReasons(analyticsSnapshot?.coverage.metrics.consistency.reasonCodes ?? [])}
              headerBadge={analyticsSnapshot ? <CoverageBadge coverage={analyticsSnapshot.coverage.metrics.consistency} /> : null}
              isEmpty={(analyticsSnapshot?.consistency.totalSessions ?? 0) === 0}
              isLoading={isAnalyticsLoading}
              heightClassName="h-28"
            >
              <ConsistencyHeatmap compact data={weeklyActivity} metric="sessions" />
            </ChartCard>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="surface-panel">
            <CardHeader className="gap-2">
              <CardTitle className="text-base">Recent PRs</CardTitle>
              <CardDescription>
                Newly established estimated 1RM highs from your logged loaded-strength work.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {areSecondaryQueriesLoading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="rounded-[20px] border border-border/70 bg-background/45 p-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="mt-2 h-6 w-32" />
                    </div>
                  ))}
                </div>
              ) : recentPrs.length === 0 ? (
                <div className="rounded-[22px] border border-border/70 bg-background/45 px-4 py-5 text-sm text-muted-foreground">
                  No PRs yet in this range. Keep logging comparable work and the newest milestones will land here.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentPrs.map((record) => (
                    <div key={`${record.exerciseId}-${record.date}`} className="rounded-[20px] border border-border/70 bg-background/45 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{record.exerciseName}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(record.date)}</p>
                        </div>
                        <TrendingUp className="text-primary" />
                      </div>
                      <p className="mt-3 text-lg font-semibold tracking-[-0.06em] text-foreground">
                        {formatWeight(record.e1rm, preferredUnit, weightRoundingLbs)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatWeight(record.weight, preferredUnit, weightRoundingLbs)} × {record.reps}
                        {record.improvementLbs !== null ? ` · +${formatWeight(record.improvementLbs, preferredUnit, weightRoundingLbs)} over the prior best` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {bodyweightSummaries.length > 0 ? (
            <Card className="surface-panel">
              <CardHeader className="gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Bodyweight Exercise Review</CardTitle>
                    <CardDescription>
                      Strict bodyweight movements get their own rep-based review lane.
                    </CardDescription>
                  </div>
                  {analyticsSnapshot ? <CoverageBadge coverage={analyticsSnapshot.coverage.metrics.bodyweightLane} /> : null}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col gap-3">
                  {bodyweightSummaries.slice(0, 3).map((summary) => (
                    <div key={summary.exerciseId} className="rounded-[20px] border border-border/70 bg-background/45 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{summary.exerciseName}</p>
                          <p className="text-xs text-muted-foreground">
                            {summary.lastSessionDate ? `Last logged ${formatDate(summary.lastSessionDate)}` : 'No completed sessions yet'}
                          </p>
                        </div>
                        <Badge variant="outline">{summary.strictSessionCount} sessions</Badge>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Last session rep best {summary.latestStrictRepBest ?? '—'} reps · {summary.totalLoggedReps} total reps logged
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="surface-panel">
            <CardHeader className="gap-2">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>
                The latest workout rows returned by the dashboard aggregate.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {isDashboardLoading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="rounded-[20px] border border-border/70 bg-background/45 p-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="mt-2 h-4 w-32" />
                    </div>
                  ))}
                </div>
              ) : recentWorkouts.length === 0 ? (
                <div className="rounded-[22px] border border-border/70 bg-background/45 px-4 py-5 text-sm text-muted-foreground">
                  Start logging workouts and the latest sessions will show up here.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentWorkouts.map((workout) => (
                    <div key={workout.id} className="rounded-[20px] border border-border/70 bg-background/45 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{workout.exerciseName}</p>
                          <p className="text-xs text-muted-foreground">Week {workout.weekNumber} · {formatDate(workout.scheduledDate)}</p>
                        </div>
                        <Badge variant={workout.completedAt ? 'secondary' : 'outline'}>
                          {workout.completedAt ? 'Completed' : 'In progress'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
