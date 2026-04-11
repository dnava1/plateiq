'use client'

import { getTemplate } from '@/lib/constants/templates'
import { isCustomProgramConfig } from '@/types/template'
import type { TrainingProgram } from '@/hooks/usePrograms'
import { useSetActiveProgram } from '@/hooks/usePrograms'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CompleteCycleDialog } from '@/components/programs/CompleteCycleDialog'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn, formatDaysPerWeek, formatWeekCycle } from '@/lib/utils'
import { toast } from 'sonner'
import { Dumbbell, Hammer } from 'lucide-react'
import type { Json } from '@/types/database'

interface ProgramConfig {
  variation_key?: string | null
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
  const rawConfig = program.config ?? null
  const isCustom = rawConfig && isCustomProgramConfig(rawConfig)
  const template = !isCustom ? getTemplate(program.template_key) : null
  const config = parseConfig(rawConfig)
  const setActive = useSetActiveProgram()

  const variationName = config.variation_key && template?.variation_options
    ? template.variation_options.find((variation) => variation.key === config.variation_key)?.name
    : null

  const daysPerWeek = isCustom
    ? (rawConfig as { days_per_week?: number }).days_per_week
    : template?.days_per_week

  const cycleWeeks = isCustom
    ? (rawConfig as { cycle_length_weeks?: number }).cycle_length_weeks
    : template?.cycle_length_weeks

  const descriptionParts = [
    typeof daysPerWeek === 'number' ? formatDaysPerWeek(daysPerWeek) : null,
    typeof cycleWeeks === 'number' ? formatWeekCycle(cycleWeeks) : null,
    variationName,
    template?.uses_training_max && config.tm_percentage ? `TM ${Math.round(config.tm_percentage * 100)}%` : null,
  ].filter(Boolean)

  const handleSetActive = () => {
    setActive.mutate(program.id, {
      onSuccess: () => toast.success(`"${program.name}" is now your active program`),
      onError: (err) => toast.error(err.message),
    })
  }

  return (
    <Card
      className={cn(
        'border-border/70 bg-card/88 shadow-sm',
        program.is_active
          ? 'ring-1 ring-primary/25'
          : 'card-hover'
      )}
    >
      <CardHeader>
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex size-11 items-center justify-center rounded-2xl',
              program.is_active ? 'bg-primary/12 text-primary' : 'bg-muted text-muted-foreground'
            )}
          >
            {isCustom ? <Hammer /> : <Dumbbell />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">{program.name}</CardTitle>
              {program.is_active && <Badge>Active</Badge>}
              {isCustom && <Badge variant="outline">Custom</Badge>}
            </div>
            {descriptionParts.length > 0 && (
              <CardDescription>
                {descriptionParts.join(' · ')}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      {program.is_active ? (
        <CardFooter className="justify-end">
          <CompleteCycleDialog program={program} />
        </CardFooter>
      ) : (
        <CardFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSetActive}
            disabled={setActive.isPending}
          >
            {setActive.isPending ? 'Setting…' : 'Set Active'}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
