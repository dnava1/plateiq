'use client'

import Link from 'next/link'
import { useActiveProgram } from '@/hooks/usePrograms'
import { getTemplate } from '@/lib/constants/templates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlusIcon } from 'lucide-react'
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

export default function DashboardPage() {
  const { data: program, isLoading } = useActiveProgram()
  const template = program ? getTemplate(program.template_key) : null
  const config = parseConfig(program?.config ?? null)
  const supplementName = config.supplement_key && template?.supplement_options
    ? template.supplement_options.find((s) => s.key === config.supplement_key)?.name
    : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Active Program Card */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Active Program</h2>
        {isLoading && (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            Loading…
          </div>
        )}
        {!isLoading && !program && (
          <div className="rounded-lg border bg-card p-6 text-center">
            <p className="text-muted-foreground text-sm">No active program.</p>
            <Link href="/programs">
              <Button size="sm" className="mt-3">
                <PlusIcon />
                Start a Program
              </Button>
            </Link>
          </div>
        )}
        {program && template && (
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{program.name}</h3>
                  <Badge variant="default" className="text-xs">Active</Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {template.days_per_week} days/week · {template.cycle_length_weeks}-week cycle
                  {supplementName ? ` · ${supplementName}` : ''}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Started {new Date(program.start_date).toLocaleDateString()}
                  {template.uses_training_max && config.tm_percentage ? ` · TM: ${Math.round(config.tm_percentage * 100)}%` : ''}
                </p>
              </div>
              <Link href="/programs">
                <Button variant="outline" size="sm">Manage</Button>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Placeholder widgets — filled in Stage 9 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Next Workout</h2>
        <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          Workout logging coming in Stage 6.
        </div>
      </section>
    </div>
  )
}

