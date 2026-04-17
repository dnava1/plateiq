'use client'

import Link from 'next/link'
import { useState } from 'react'
import { getTemplate } from '@/lib/constants/templates'
import { normalizeEditableProgramConfig } from '@/lib/programs/editable'
import { isCustomProgramConfig } from '@/types/template'
import type { TrainingProgram } from '@/hooks/usePrograms'
import { useDeleteProgram, useSetActiveProgram } from '@/hooks/usePrograms'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { CompleteCycleDialog } from '@/components/programs/CompleteCycleDialog'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, formatDaysPerWeek, formatWeekCycle } from '@/lib/utils'
import { toast } from 'sonner'
import { Dumbbell, Hammer, PencilLine, Trash2 } from 'lucide-react'
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
  const [deleteOpen, setDeleteOpen] = useState(false)
  const rawConfig = program.config ?? null
  const customDefinition = rawConfig && isCustomProgramConfig(rawConfig) ? rawConfig : null
  const hasCustomDefinition = Boolean(customDefinition)
  const editableConfig = customDefinition
    ? normalizeEditableProgramConfig(customDefinition, program.template_key)
    : null
  const sourceTemplateKey = editableConfig?.metadata?.source_template_key ?? program.template_key
  const template = getTemplate(sourceTemplateKey) ?? null
  const config = parseConfig(rawConfig)
  const setActive = useSetActiveProgram()
  const deleteProgram = useDeleteProgram()

  const selectedVariationKey = editableConfig?.metadata?.selected_variation_key ?? config.variation_key
  const variationName = selectedVariationKey && template?.variation_options
    ? template.variation_options.find((variation) => variation.key === selectedVariationKey)?.name
    : null

  const daysPerWeek = hasCustomDefinition
    ? editableConfig?.days_per_week
    : template?.days_per_week

  const cycleWeeks = hasCustomDefinition
    ? editableConfig?.cycle_length_weeks
    : template?.cycle_length_weeks

  const templateTmPercentage = hasCustomDefinition ? editableConfig?.tm_percentage : config.tm_percentage
  const sourceTemplateName = hasCustomDefinition && editableConfig?.metadata?.source_template_key && template
    ? `Based on ${template.name}`
    : null
  const definitionBadgeLabel = hasCustomDefinition
    ? editableConfig?.metadata?.source_template_key
      ? 'Customized'
      : 'Custom'
    : null
  const usesScratchIcon = hasCustomDefinition && !editableConfig?.metadata?.source_template_key

  const descriptionParts = [
    sourceTemplateName,
    typeof daysPerWeek === 'number' ? formatDaysPerWeek(daysPerWeek) : null,
    typeof cycleWeeks === 'number' ? formatWeekCycle(cycleWeeks) : null,
    variationName,
    template?.uses_training_max && templateTmPercentage ? `TM ${Math.round(templateTmPercentage * 100)}%` : null,
  ].filter(Boolean)

  const editHref = `/programs/builder?programId=${program.id}`

  const handleSetActive = () => {
    setActive.mutate(program.id, {
      onSuccess: () => toast.success(`"${program.name}" is now your active program`),
      onError: (err) => toast.error(err.message),
    })
  }

  const handleDelete = () => {
    deleteProgram.mutate(program.id, {
      onSuccess: () => {
        toast.success(`"${program.name}" deleted.`)
        setDeleteOpen(false)
      },
      onError: (err) => toast.error(err.message),
    })
  }

  return (
    <>
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
              {usesScratchIcon ? <Hammer /> : <Dumbbell />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{program.name}</CardTitle>
                {program.is_active && <Badge>Active</Badge>}
                {definitionBadgeLabel && <Badge variant="outline">{definitionBadgeLabel}</Badge>}
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
          <CardFooter className="justify-end gap-2">
            <Link href={editHref} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <PencilLine data-icon="inline-start" />
              Edit
            </Link>
            <CompleteCycleDialog program={program} />
          </CardFooter>
        ) : (
          <CardFooter className="justify-end gap-2">
            <Link href={editHref} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <PencilLine data-icon="inline-start" />
              Edit
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSetActive}
              disabled={setActive.isPending}
            >
              {setActive.isPending ? 'Setting…' : 'Set Active'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              disabled={deleteProgram.isPending}
            >
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          </CardFooter>
        )}
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete program?</DialogTitle>
            <DialogDescription>
              Deleting &quot;{program.name}&quot; also removes its cycles, workouts, and logged sets. This only applies to inactive programs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProgram.isPending}>
              {deleteProgram.isPending ? 'Deleting…' : 'Delete Program'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
