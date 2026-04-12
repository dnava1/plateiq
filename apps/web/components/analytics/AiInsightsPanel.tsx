'use client'

import { useState } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'
import { useInsights } from '@/hooks/useInsights'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import type { AnalyticsDateRange } from '@/hooks/useAnalytics'
import type { TrainingInsight } from '@/types/insights'
import { formatDateAsLocalIso } from '@/lib/utils'

interface AiInsightsPanelProps {
  dateRange: AnalyticsDateRange
  dateRangeLabel: string
  hasAnalyticsData: boolean
  recentPrCount: number
  selectedExerciseId: number | null
  selectedExerciseName: string | null
  stallCount: number
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

export function AiInsightsPanel({
  dateRange,
  dateRangeLabel,
  hasAnalyticsData,
  recentPrCount,
  selectedExerciseId,
  selectedExerciseName,
  stallCount,
}: AiInsightsPanelProps) {
  const insightMutation = useInsights()
  const [insight, setInsight] = useState<TrainingInsight | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
            Generate a structured coaching read from the same analytics filter shown in this dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex flex-col gap-4">
            <div className="rounded-[22px] border border-border/70 bg-background/45 p-4">
              <p className="text-sm leading-6 text-muted-foreground">
                {hasAnalyticsData
                  ? `This request uses the ${dateRangeLabel.toLowerCase()} analytics snapshot${selectedExerciseName ? ` for ${selectedExerciseName}` : ''}, not raw workout history.`
                  : 'Build a little more training history first. AI insights depend on the aggregated analytics snapshot shown in the other tabs.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleGenerate} disabled={!hasAnalyticsData || insightMutation.isPending} aria-label={generateLabel}>
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
                Generate an insight to see a concise summary plus strengths, concerns, and next-step recommendations.
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
              <span className="eyebrow">Snapshot Ready</span>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-foreground">{hasAnalyticsData ? 'Yes' : 'Not yet'}</p>
            </div>
            <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
              <span className="eyebrow">PR Signals</span>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-foreground">{recentPrCount}</p>
            </div>
            <div className="rounded-[20px] border border-border/70 bg-background/45 p-4">
              <span className="eyebrow">Stalls Flagged</span>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-foreground">{stallCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {insight && (
        <div className="grid gap-4 xl:grid-cols-2" aria-live="polite">
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
      )}
    </div>
  )
}