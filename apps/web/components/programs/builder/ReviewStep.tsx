'use client'

import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { formatDaysPerWeek, formatWeight, formatWeekCycle } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useBuilderDraftStore } from '@/store/builderDraftStore'
import { DEFAULT_LINEAR_INCREMENT_LBS, usesLinearProgression } from '@/store/builderDraftStore'
import {
  useCreateProgramDefinition,
  useCreateProgramRevision,
  useUpdateProgramDefinition,
} from '@/hooks/usePrograms'
import { normalizeEditableProgramConfig } from '@/lib/programs/editable'
import {
  createCustomProgramSchema,
  getCreateCustomProgramErrorMessage,
} from '@/lib/validations/program'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { IntensityType } from '@/types/domain'

const BLOCK_ROLE_LABELS: Record<'primary' | 'variation' | 'accessory', string> = {
  primary: 'primary',
  variation: 'variation',
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
  const { draft, source, toConfig, resetDraft, setStep } = useBuilderDraftStore()
  const preferredUnit = usePreferredUnit()
  const createProgramDefinition = useCreateProgramDefinition()
  const updateProgramDefinition = useUpdateProgramDefinition()
  const createProgramRevision = useCreateProgramRevision()
  const progressionIncrements = usesLinearProgression(draft.progression.style)
    ? draft.progression.increment_lbs ?? DEFAULT_LINEAR_INCREMENT_LBS
    : null

  const templateKey = source?.template_key ?? draft.metadata?.source_template_key ?? 'custom'
  const saveStrategy = source?.save_strategy ?? 'create'
  const isPending = createProgramDefinition.isPending
    || updateProgramDefinition.isPending
    || createProgramRevision.isPending

  const handleSubmit = () => {
    const config = normalizeEditableProgramConfig(toConfig(), templateKey)
    const result = createCustomProgramSchema.safeParse({ name: draft.name, definition: config })

    if (!result.success) {
      toast.error(getCreateCustomProgramErrorMessage(result.error))
      return
    }

    const handleSuccess = (message: string) => {
      toast.success(message)
      resetDraft()
      router.push('/programs')
    }

    const handleError = (err: Error) => {
      toast.error(err.message)
    }

    if (saveStrategy === 'update' && source?.program_id) {
      updateProgramDefinition.mutate(
        {
          programId: source.program_id,
          name: result.data.name,
          templateKey,
          definition: result.data.definition,
        },
        {
          onSuccess: () => handleSuccess(`"${draft.name}" updated.`),
          onError: handleError,
        },
      )
      return
    }

    if (saveStrategy === 'revision' && source?.program_id) {
      createProgramRevision.mutate(
        {
          sourceProgramId: source.program_id,
          name: result.data.name,
          templateKey,
          definition: result.data.definition,
          activateOnSave: false,
        },
        {
          onSuccess: () => handleSuccess(`"${draft.name}" saved as a new program.`),
          onError: handleError,
        },
      )
      return
    }

    createProgramDefinition.mutate(
      {
        name: result.data.name,
        templateKey,
        definition: result.data.definition,
        activateOnSave: true,
      },
      {
        onSuccess: () => handleSuccess(`"${draft.name}" created!`),
        onError: handleError,
      },
    )
  }

  const formatIntensity = (val: number, type: IntensityType) => {
    if (type === 'percentage_tm') return `${Math.round(val * 100)}% TM`
    if (type === 'percentage_1rm') return `${Math.round(val * 100)}% 1RM`
    if (type === 'percentage_work_set') return `${Math.round(val * 100)}% work set`
    if (type === 'rpe') return `RPE ${val}`
    if (type === 'bodyweight') return 'Bodyweight'
    return formatWeight(val, preferredUnit)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-[24px] border border-border/70 bg-card/82 p-4 shadow-sm">
        <h3 className="text-lg font-semibold tracking-[-0.04em] text-foreground">{draft.name}</h3>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>{formatDaysPerWeek(draft.days_per_week)}</span>
          <span>{formatWeekCycle(draft.cycle_length_weeks)}</span>
          <span>Progression: {STYLE_LABELS[draft.progression.style]}</span>
          {draft.uses_training_max && <span>Training max: {Math.round(draft.tm_percentage * 100)}%</span>}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {draft.days.map((day, di) => (
          <div key={di} className="flex flex-col gap-3 rounded-[24px] border border-border/70 bg-card/82 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold text-primary">
                {di + 1}
              </span>
              <h4 className="text-sm font-medium text-foreground">{day.label}</h4>
              <span className="text-xs text-muted-foreground">{day.exercise_blocks.length} exercise{day.exercise_blocks.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex flex-col gap-3 sm:pl-9">
              {day.exercise_blocks.map((block, bi) => (
                <div key={bi} className="flex flex-col gap-2 rounded-[18px] bg-background/60 p-3 text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{block.exercise_key || 'Unnamed exercise'}</span>
                    <span className="text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">{BLOCK_ROLE_LABELS[block.role]}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {block.sets.map((set, si) => (
                      <span key={si} className="rounded-full bg-muted px-2.5 py-1 text-foreground">
                        {set.sets}×{set.reps} at {formatIntensity(set.intensity, set.intensity_type)}
                      </span>
                    ))}
                  </div>
                  {block.notes && <p className="text-xs italic text-muted-foreground">{block.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[24px] border border-border/70 bg-card/82 p-4 text-sm text-muted-foreground shadow-sm">
        <p className="mb-2 text-sm font-medium text-foreground">Progression</p>
        <p>Style: {STYLE_LABELS[draft.progression.style]}</p>
        {progressionIncrements && (
          <p>Upper: +{formatWeight(progressionIncrements.upper, preferredUnit)} · Lower: +{formatWeight(progressionIncrements.lower, preferredUnit)}</p>
        )}
        {draft.progression.deload_trigger && <p>Deload trigger: {draft.progression.deload_trigger}</p>}
        {draft.progression.deload_strategy && <p>Deload strategy: {draft.progression.deload_strategy}</p>}
      </div>

      {saveStrategy === 'revision' && (
        <div className="rounded-[24px] border border-amber-500/30 bg-amber-500/8 p-4 text-sm text-amber-950 shadow-sm dark:text-amber-100">
          This program already has workout history, so saving here will create a new editable revision instead of rewriting past training data.
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep('progression')} className="flex-1">
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={isPending} className="flex-1">
          {isPending
            ? saveStrategy === 'update'
              ? 'Saving…'
              : saveStrategy === 'revision'
                ? 'Saving revision…'
                : 'Creating…'
            : saveStrategy === 'update'
              ? 'Save Changes'
              : saveStrategy === 'revision'
                ? 'Save as New Program'
                : 'Create Program'}
        </Button>
      </div>
    </div>
  )
}
