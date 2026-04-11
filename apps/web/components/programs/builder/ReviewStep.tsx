'use client'

import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { formatWeight } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useBuilderDraftStore } from '@/store/builderDraftStore'
import { DEFAULT_LINEAR_INCREMENT_LBS, usesLinearProgression } from '@/store/builderDraftStore'
import { useCreateCustomProgram } from '@/hooks/usePrograms'
import {
  createCustomProgramSchema,
  getCreateCustomProgramErrorMessage,
} from '@/lib/validations/program'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { IntensityType } from '@/types/domain'

const BLOCK_ROLE_LABELS: Record<'primary' | 'supplement' | 'accessory', string> = {
  primary: 'primary',
  supplement: 'variation',
  accessory: 'accessory',
}

const STYLE_LABELS: Record<string, string> = {
  linear_per_session: 'Linear / Session',
  linear_per_week: 'Linear / Week',
  linear_per_cycle: 'Linear / Cycle',
  percentage_cycle: '% Cycle',
  wave: 'Wave',
  autoregulated: 'Autoregulated',
  custom: 'Custom',
}

export function ReviewStep() {
  const router = useRouter()
  const { draft, toConfig, resetDraft, setStep } = useBuilderDraftStore()
  const preferredUnit = usePreferredUnit()
  const createCustom = useCreateCustomProgram()
  const progressionIncrements = usesLinearProgression(draft.progression.style)
    ? draft.progression.increment_lbs ?? DEFAULT_LINEAR_INCREMENT_LBS
    : null

  const handleSubmit = () => {
    const config = toConfig()
    const result = createCustomProgramSchema.safeParse({ name: draft.name, definition: config })
    if (!result.success) {
      toast.error(getCreateCustomProgramErrorMessage(result.error))
      return
    }
    createCustom.mutate(result.data, {
      onSuccess: () => {
        toast.success(`"${draft.name}" created!`)
        resetDraft()
        router.push('/programs')
      },
      onError: (err) => toast.error(err.message),
    })
  }

  const formatIntensity = (val: number, type: IntensityType) => {
    if (type === 'percentage_tm') return `${Math.round(val * 100)}% TM`
    if (type === 'percentage_1rm') return `${Math.round(val * 100)}% 1RM`
    if (type === 'percentage_work_set') return `${Math.round(val * 100)}% Work`
    if (type === 'rpe') return `RPE ${val}`
    if (type === 'bodyweight') return 'Bodyweight'
    return formatWeight(val, preferredUnit)
  }

  return (
    <div className="space-y-5">
      {/* Summary header */}
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">{draft.name}</h3>
          {draft.level && (
            <Badge variant="outline" className="text-xs capitalize">{draft.level}</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>{draft.days_per_week} days/week</span>
          <span>{draft.cycle_length_weeks}-week cycle</span>
          <span>Progression: {STYLE_LABELS[draft.progression.style]}</span>
          {draft.uses_training_max && <span>TM: {Math.round(draft.tm_percentage * 100)}%</span>}
        </div>
      </div>

      {/* Days detail */}
      <div className="space-y-3">
        {draft.days.map((day, di) => (
          <div key={di} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                {di + 1}
              </span>
              <h4 className="font-medium text-sm">{day.label}</h4>
              <span className="text-xs text-muted-foreground">{day.exercise_blocks.length} exercise{day.exercise_blocks.length !== 1 ? 's' : ''}</span>
            </div>
            {day.exercise_blocks.map((block, bi) => (
              <div key={bi} className="ml-8 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{block.exercise_key || 'Unnamed exercise'}</span>
                <span className="text-[10px] uppercase ml-1.5 text-muted-foreground">({BLOCK_ROLE_LABELS[block.role]})</span>
                <div className="mt-0.5">
                  {block.sets.map((s, si) => (
                    <span key={si} className="mr-2">
                      {s.sets}×{s.reps} @ {formatIntensity(s.intensity, s.intensity_type)}
                    </span>
                  ))}
                </div>
                {block.notes && <p className="text-[10px] italic mt-0.5">{block.notes}</p>}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Progression */}
      <div className="rounded-xl border bg-card p-4 text-xs text-muted-foreground">
        <p className="mb-1 text-sm font-medium text-foreground">Progression</p>
        <p>Style: {STYLE_LABELS[draft.progression.style]}</p>
        {progressionIncrements && (
          <p>Upper: +{formatWeight(progressionIncrements.upper, preferredUnit)} · Lower: +{formatWeight(progressionIncrements.lower, preferredUnit)}</p>
        )}
        {draft.progression.deload_trigger && <p>Deload trigger: {draft.progression.deload_trigger}</p>}
        {draft.progression.deload_strategy && <p>Deload strategy: {draft.progression.deload_strategy}</p>}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep('progression')} className="flex-1">
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={createCustom.isPending} className="flex-1">
          {createCustom.isPending ? 'Creating…' : 'Create Program'}
        </Button>
      </div>
    </div>
  )
}
