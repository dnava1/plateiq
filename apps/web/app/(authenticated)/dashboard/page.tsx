'use client'

import Link from 'next/link'
import { useActiveProgram } from '@/hooks/usePrograms'
import { getTemplate } from '@/lib/constants/templates'
import { isCustomProgramConfig } from '@/types/template'
import { formatDaysPerWeek, formatWeekCycle } from '@/lib/utils'
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
import { Dumbbell, PlusIcon } from 'lucide-react'
import type { Json } from '@/types/database'

interface ProgramConfig {
  supplement_key?: string | null
  rounding?: number
  tm_percentage?: number
}

function parseConfig(config: Json | null): ProgramConfig {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return {}
  return config as ProgramConfig
}

function formatUnit(value: number | undefined, singular: string, plural = `${singular}s`) {
  if (typeof value !== 'number') return `-- ${plural}`
  return `${value} ${value === 1 ? singular : plural}`
}

export default function DashboardPage() {
  const { data: program, isLoading } = useActiveProgram()
  const config = parseConfig(program?.config ?? null)
  const rawConfig = program?.config ?? null
  const isCustom = rawConfig && isCustomProgramConfig(rawConfig)
  const template = program && !isCustom ? getTemplate(program.template_key) : null
  const supplementName = config.supplement_key && template?.supplement_options
    ? template.supplement_options.find((s) => s.key === config.supplement_key)?.name
    : null

  const daysPerWeek = isCustom
    ? (rawConfig as { days_per_week?: number }).days_per_week
    : template?.days_per_week

  const cycleWeeks = isCustom
    ? (rawConfig as { cycle_length_weeks?: number }).cycle_length_weeks
    : template?.cycle_length_weeks

  const summaryParts = [
    typeof daysPerWeek === 'number' ? formatDaysPerWeek(daysPerWeek) : null,
    typeof cycleWeeks === 'number' ? formatWeekCycle(cycleWeeks) : null,
    supplementName,
  ].filter(Boolean)

  return (
    <div className="page-shell max-w-5xl">
      <section className="page-header">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Overview</span>
          <div className="flex flex-col gap-2">
            <h1 className="page-title">Dashboard</h1>
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] xl:items-start">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="metric-tile flex flex-col gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>

          <Card className="surface-panel">
            <CardContent className="flex flex-col gap-4 pt-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-48" />
            </CardContent>
          </Card>
        </section>
      ) : !program ? (
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
      ) : (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] xl:items-start">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="metric-tile flex flex-col gap-2">
              <span className="eyebrow">Cadence</span>
              <p className="text-3xl font-semibold tracking-[-0.07em] text-foreground">
                {formatUnit(daysPerWeek, 'day')}
              </p>
              <p className="text-sm text-muted-foreground">Per week</p>
            </div>
            <div className="metric-tile flex flex-col gap-2">
              <span className="eyebrow">Cycle</span>
              <p className="text-3xl font-semibold tracking-[-0.07em] text-foreground">
                {formatUnit(cycleWeeks, 'week')}
              </p>
              <p className="text-sm text-muted-foreground">Current block length</p>
            </div>
          </div>

          <Card className="surface-panel">
            <CardHeader className="gap-5">
              <div className="flex items-start gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Dumbbell />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-xl">{program.name}</CardTitle>
                    <Badge>Active</Badge>
                    {isCustom && <Badge variant="outline">Custom</Badge>}
                  </div>
                  <CardDescription>
                    {summaryParts.join(' · ')}
                  </CardDescription>
                </div>
              </div>
              <CardAction>
                <Link href="/programs" className={buttonVariants({ variant: 'outline' })}>
                  Manage
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Your active program stays pinned at the center of the training flow so adjustments are easy to find without competing with setup tasks.
              </p>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}
