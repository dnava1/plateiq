'use client'

import { getTemplate } from '@/lib/constants/templates'
import type { TrainingProgram } from '@/hooks/usePrograms'
import { useSetActiveProgram } from '@/hooks/usePrograms'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
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

interface ProgramCardProps {
  program: TrainingProgram
}

export function ProgramCard({ program }: ProgramCardProps) {
  const template = getTemplate(program.template_key)
  const config = parseConfig(program.config)
  const setActive = useSetActiveProgram()
  const supplementName = config.supplement_key && template?.supplement_options
    ? template.supplement_options.find((s) => s.key === config.supplement_key)?.name
    : null

  const handleSetActive = () => {
    setActive.mutate(program.id, {
      onSuccess: () => toast.success(`"${program.name}" is now your active program`),
      onError: (err) => toast.error(err.message),
    })
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{program.name}</h3>
            {program.is_active && (
              <Badge variant="default" className="text-xs">Active</Badge>
            )}
          </div>
          {template && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {template.days_per_week}d/wk · {template.cycle_length_weeks}-week cycle
              {supplementName ? ` · ${supplementName}` : ''}
            </p>
          )}
        </div>
        <div className="flex items-start gap-3">
          {!program.is_active && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSetActive}
              disabled={setActive.isPending}
            >
              {setActive.isPending ? 'Setting…' : 'Set Active'}
            </Button>
          )}
          <div className="text-right text-xs text-muted-foreground">
            <div>Started {new Date(program.start_date).toLocaleDateString()}</div>
            {config.tm_percentage && (
              <div>TM: {Math.round(config.tm_percentage * 100)}%</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
