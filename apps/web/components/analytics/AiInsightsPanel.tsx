'use client'

import { useState } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'
import { useInsights } from '@/hooks/useInsights'
import { formatAnalyticsCoverageFamily, summarizeAnalyticsCoverageFamilies } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import type { AnalyticsDateRange } from '@/hooks/useAnalytics'
import type { AnalyticsCoverage } from '@/types/analytics'
import type { ProgressionGuidanceAction, TrainingInsight } from '@/types/insights'
import { formatDateAsLocalIso } from '@/lib/utils'

interface AiInsightsPanelProps {
  coverage: AnalyticsCoverage
  dateRange: AnalyticsDateRange
  dateRangeLabel: string
  hasAnalyticsData: boolean
  isInsightEligible: boolean
  selectedExerciseId: number | null
  selectedExerciseName: string | null
}

function InsightList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="rounded-[18px] border border-border/60 bg-background/45 px-4 py-3">
          {item}
        </li>
      ))}
    </ul>
  )
}

function formatGuidanceActionLabel(action: ProgressionGuidanceAction) {
  switch (action) {
    case 'increase':
      return 'Increase'
    case 'hold':
      return 'Hold'
    case 'repeat':
      return 'Repeat'
    case 'review':
      return 'Review'
    default:
      return 'Progression'
  }
}

export function AiInsightsPanel({
  coverage,
  dateRange,
  dateRangeLabel,
  hasAnalyticsData,
  isInsightEligible,
  selectedExerciseId,
  selectedExerciseName,
}: AiInsightsPanelProps) {
  const insightMutation = useInsights()
  const [insight, setInsight] = useState<TrainingInsight | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const coverageFamilies = summarizeAnalyticsCoverageFamilies(coverage)
  const readyFamilyCount = coverageFamilies.filter((family) => family.status === 'ready').length
  const bodyweightCoverage = coverage.metrics.bodyweightLane.status

  const handleGenerate = () => {
    setInsight(null)
    setErrorMessage(null)
    insightMutation.reset()
    insightMutation.mutate(
      {
        dateFrom: formatDateAsLocalIso(dateRange.from),
        dateTo: formatDateAsLocalIso(dateRange.to),
        exerciseId: selectedExerciseId,
      },
      {
        onError: (error) => {
          setErrorMessage(error.message)
        },
        onSuccess: (nextInsight) => {
          setInsight(nextInsight)
        },
      },
    )
  }

  const generateLabel = selectedExerciseName
    ? `Generate insight for ${selectedExerciseName}`
    : 'Generate insight for current analytics filter'

  return (
    <div className="grid gap-4">
      <Card className="surface-panel">
        <CardHeader className="gap-2">
          <h2 className="font-heading text-base font-medium text-foreground">AI Insights</h2>
          <CardDescription>
            Generate a structured coaching read from the same analytics filter shown in this dashboard, with bounded future-looking guidance when the signal supports it.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex flex-col gap-4">
            <div className="rounded-[22px] border border-border/70 bg-background/45 p-4">
              <p className="text-sm leading-6 text-muted-foreground">
                {isInsightEligible
                  ? `This request uses the ${dateRangeLabel.toLowerCase()} method-aware analytics snapshot${selectedExerciseName ? ` for ${selectedExerciseName}` : ''}, not raw workout history.`
                  : hasAnalyticsData
                    ? 'The current snapshot is still too thin or too method-specific to support a useful AI read. Build a little more comparable signal first.'
                    : 'Build a little more training history first. AI insights depend on the aggregated analytics snapshot shown in the other tabs.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {coverageFamilies.map((family) => (
                <Badge key={family.family} variant="outline">
                  {formatAnalyticsCoverageFamily(family.family)}: {family.status}
                </Badge>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleGenerate} disabled={!isInsightEligible || insightMutation.isPending} aria-label={generateLabel}>
                {insightMutation.isPending ? (
                  <RefreshCw className="animate-spin" data-icon="inline-start" />
                ) : (
                  <Sparkles data-icon="inline-start" />
                )}
                {insightMutation.isPending ? 'Generating insight...' : 'Generate insight'}
              </Button>
              <p className="text-sm text-muted-foreground">
                Scope: {selectedExerciseName ?? 'All exercises'}
              </p>
            </div>

            {errorMessage && (
              <div role="alert" className="rounded-[18px] border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

            {!insight && !errorMessage && (
              <div className="rounded-[18px] border border-dashed border-border/70 bg-background/35 px-4 py-5 text-sm leading-6 text-muted-foreground">
                Generate an insight to see a concise summary, strengths, concerns, next-step recommendations, and bounded progression guidance when the current lift has enough comparable signal.
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
              <span className="eyebrow">Insight Ready</span>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-foreground">{isInsightEligible ? 'Yes' : 'Not yet'}</p>
            </div>
            <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
              <span className="eyebrow">Ready Families</span>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-foreground">{readyFamilyCount}</p>
            </div>
            <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
              <span className="eyebrow">Bodyweight Lane</span>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-foreground">{bodyweightCoverage === 'ready' ? 'Ready' : bodyweightCoverage === 'limited' ? 'Limited' : 'Off'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {insight && (
        <div className="grid gap-4" aria-live="polite">
          {insight.progressionGuidance.disposition === 'bounded' ? (
            <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Progression guidance bounded</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-foreground">
                {insight.progressionGuidance.note}
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            {insight.progressionGuidance.disposition === 'actionable' ? (
              <Card className="surface-panel xl:col-span-2">
                <CardHeader className="gap-2">
                  <h3 className="font-heading text-base font-medium text-foreground">Progression Guidance</h3>
                  <CardDescription>Forward-looking call blended into this insight when the selected lift has enough comparable signal.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{formatGuidanceActionLabel(insight.progressionGuidance.action)}</Badge>
                    <Badge variant="outline">{formatAnalyticsCoverageFamily(insight.progressionGuidance.methodContext)}</Badge>
                    <Badge variant="outline">{insight.progressionGuidance.exerciseName}</Badge>
                  </div>
                  <div className="mt-4 rounded-[20px] border border-border/70 bg-background/45 p-4 text-sm leading-7 text-foreground">
                    {insight.progressionGuidance.rationale}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    This stays advisory until you confirm the next change in your actual program flow.
                  </p>
                </CardContent>
              </Card>
            ) : null}

          <Card className="surface-panel xl:col-span-2">
            <CardHeader className="gap-2">
              <h3 className="font-heading text-base font-medium text-foreground">Summary</h3>
              <CardDescription>High-level read on the current analytics filter.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-[20px] border border-border/70 bg-background/45 p-4 text-sm leading-7 text-foreground">
                {insight.summary}
              </div>
            </CardContent>
          </Card>

          <Card className="surface-panel">
            <CardHeader className="gap-2">
              <h3 className="font-heading text-base font-medium text-foreground">Strengths</h3>
              <CardDescription>Signals worth preserving.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <InsightList items={insight.strengths} />
            </CardContent>
          </Card>

          <Card className="surface-panel">
            <CardHeader className="gap-2">
              <h3 className="font-heading text-base font-medium text-foreground">Concerns</h3>
              <CardDescription>Areas to watch before they become problems.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <InsightList items={insight.concerns} />
            </CardContent>
          </Card>

          <Card className="surface-panel xl:col-span-2">
            <CardHeader className="gap-2">
              <h3 className="font-heading text-base font-medium text-foreground">Recommendations</h3>
              <CardDescription>Practical next actions for the current training block.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <InsightList items={insight.recommendations} />
            </CardContent>
          </Card>
          </div>
        </div>
      )}
    </div>
  )
}