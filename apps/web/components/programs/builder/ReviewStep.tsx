'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useExercises, buildExerciseKeyMap, resolveExerciseIdFromMap } from '@/hooks/useExercises'
import { useCurrentTrainingMaxes } from '@/hooks/useTrainingMaxes'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import {
  useCreateProgramDefinition,
  useCreateProgramRevision,
  useUpdateProgramDefinition,
} from '@/hooks/usePrograms'
import { TrainingMaxPanel } from '@/components/exercises/TrainingMaxPanel'
import { Button } from '@/components/ui/button'
import { normalizeEditableProgramConfig } from '@/lib/programs/editable'
import { resolveDefinitionNeedsTrainingMaxForExecution } from '@/lib/programs/method'
import { resolveExecutionMaxInputScope, type ExecutionMaxInputMode } from '@/lib/programs/trainingMax'
import { resolveProgramDays, resolveProgramWeekLabel } from '@/lib/programs/week'
import {
  createCustomProgramSchema,
  getCreateCustomProgramErrorMessage,
} from '@/lib/validations/program'
import { formatDaysPerWeek, formatWeight, formatWeekCycle } from '@/lib/utils'
import { DEFAULT_LINEAR_INCREMENT_LBS, useBuilderDraftStore, usesLinearProgression } from '@/store/builderDraftStore'
import type { DayTemplate, SetDisplayType, SetPrescription } from '@/types/template'
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

const METHOD_LABELS = {
  tm_driven: 'Training-max driven',
  general: 'General / flexible loading',
} as const

function formatRestDurationLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function formatSetDisplayLabel(displayType: SetDisplayType | undefined) {
  switch (displayType) {
    case 'backoff':
      return 'backoff'
    case 'drop':
      return 'drop set'
    default:
      return null
  }
}

function formatTrainingMaxTargetLabel(value: string) {
  return value
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (segment) => segment.toUpperCase())
}

function resolveRequiredInputCopy(inputMode: ExecutionMaxInputMode) {
  switch (inputMode) {
    case '1rm':
      return {
        badgeLabel: 'Required lifts',
        emptyStateHint: 'Choose the lifts this program depends on before setting 1RM inputs here.',
        loadingMessage: 'Loading the required 1RM inputs for this program.',
        missingActionMessage: 'Set current estimated 1RMs for',
        readyMessage: 'All required 1RM inputs are set for this program.',
        title: 'Required 1RM Inputs',
        toastLoadingMessage: 'Required 1RM inputs are still loading for this program.',
        toastMissingActionMessage: 'Set current estimated 1RMs for',
        description: 'Set the current estimated 1RM for every lift in this program before you save it. Each dialog can still accept a training max directly if that is what you have.',
      }
    case 'mixed':
      return {
        badgeLabel: 'Required lifts',
        emptyStateHint: 'Choose the lifts this program depends on before setting max inputs here.',
        loadingMessage: 'Loading the required max inputs for this program.',
        missingActionMessage: 'Set the required max inputs for',
        readyMessage: 'All required max inputs are set for this program.',
        title: 'Required Max Inputs',
        toastLoadingMessage: 'Required max inputs are still loading for this program.',
        toastMissingActionMessage: 'Set the required max inputs for',
        description: 'Set the current TM or estimated 1RM for every lift in this program before you save it.',
      }
    default:
      return {
        badgeLabel: 'Required lifts',
        emptyStateHint: 'Choose the lifts this program depends on before setting training maxes here.',
        loadingMessage: 'Loading the required training maxes for this program.',
        missingActionMessage: 'Set current training maxes for',
        readyMessage: 'All required training maxes are set for this program.',
        title: 'Required Training Maxes',
        toastLoadingMessage: 'Training max requirements are still loading for this program.',
        toastMissingActionMessage: 'Set current training maxes for',
        description: 'Set the current training max for every lift in this program before you save it.',
      }
  }
}

export function ReviewStep() {
  const router = useRouter()
  const { draft, source, toConfig, resetDraft, setStep } = useBuilderDraftStore()
  const { data: exercises = [], isLoading: areExercisesLoading } = useExercises()
  const { data: trainingMaxes = [], isLoading: areTrainingMaxesLoading } = useCurrentTrainingMaxes()
  const preferredUnit = usePreferredUnit()
  const createProgramDefinition = useCreateProgramDefinition()
  const updateProgramDefinition = useUpdateProgramDefinition()
  const createProgramRevision = useCreateProgramRevision()
  const progressionIncrements = usesLinearProgression(draft.progression.style)
    ? draft.progression.increment_lbs ?? DEFAULT_LINEAR_INCREMENT_LBS
    : null
  const methodLabel = draft.uses_training_max ? METHOD_LABELS.tm_driven : METHOD_LABELS.general
  const requiresMaxInputs = resolveDefinitionNeedsTrainingMaxForExecution(draft)
  const maxInputScope = resolveExecutionMaxInputScope(draft)
  const requiredInputCopy = resolveRequiredInputCopy(maxInputScope.inputMode)
  const exerciseKeyMap = buildExerciseKeyMap(exercises)
  const resolvedRequiredExerciseIds = [...maxInputScope.exerciseIds]
  const seenRequiredExerciseIds = new Set(resolvedRequiredExerciseIds)
  const unresolvedMaxInputNames: string[] = []

  for (const exerciseKey of maxInputScope.exerciseKeys) {
    const resolvedExerciseId = resolveExerciseIdFromMap(exerciseKeyMap, exerciseKey)

    if (resolvedExerciseId) {
      if (!seenRequiredExerciseIds.has(resolvedExerciseId)) {
        seenRequiredExerciseIds.add(resolvedExerciseId)
        resolvedRequiredExerciseIds.push(resolvedExerciseId)
      }
      continue
    }

    unresolvedMaxInputNames.push(formatTrainingMaxTargetLabel(exerciseKey))
  }

  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  const resolvedRequiredExercises = resolvedRequiredExerciseIds.flatMap((exerciseId) => {
    const exercise = exerciseById.get(exerciseId)
    return exercise ? [exercise] : []
  })
  const trainingMaxExerciseIds = new Set(trainingMaxes.map((trainingMax) => trainingMax.exercise_id))
  const missingMaxInputNames = [
    ...resolvedRequiredExercises
      .filter((exercise) => !trainingMaxExerciseIds.has(exercise.id))
      .map((exercise) => exercise.name),
    ...unresolvedMaxInputNames,
  ]

  if (requiresMaxInputs && resolvedRequiredExerciseIds.length === 0 && maxInputScope.exerciseKeys.length === 0) {
    missingMaxInputNames.push('the selected primary lifts')
  }

  const templateKey = source?.template_key ?? draft.metadata?.source_template_key ?? 'custom'
  const saveStrategy = source?.save_strategy ?? 'create'
  const weeklyStructure = Array.from({ length: draft.cycle_length_weeks }, (_, index) => {
    const weekNumber = index + 1

    return {
      days: resolveProgramDays(draft, weekNumber),
      label: resolveProgramWeekLabel(draft, weekNumber),
      weekNumber,
    }
  })
  const showPerWeekStructure = Boolean(draft.week_schemes && draft.cycle_length_weeks > 1)
  const isPending = createProgramDefinition.isPending
    || updateProgramDefinition.isPending
    || createProgramRevision.isPending
  const isTrainingMaxStateLoading = requiresMaxInputs && (areExercisesLoading || areTrainingMaxesLoading)
  const isTrainingMaxRequirementMet = !requiresMaxInputs && !isTrainingMaxStateLoading
    ? true
    : requiresMaxInputs && !isTrainingMaxStateLoading && missingMaxInputNames.length === 0
  const isSaveDisabled = isPending || isTrainingMaxStateLoading || (requiresMaxInputs && !isTrainingMaxRequirementMet)
  const showHistoryPreservationNote = saveStrategy !== 'revision' && Boolean(source?.has_workout_history)

  const handleSubmit = () => {
    if (isTrainingMaxStateLoading) {
      toast.error(requiredInputCopy.toastLoadingMessage)
      return
    }

    if (requiresMaxInputs && missingMaxInputNames.length > 0) {
      toast.error(`${requiredInputCopy.toastMissingActionMessage} ${missingMaxInputNames.join(', ')} before saving this program.`)
      return
    }

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

  const formatIntensity = (value: number, type: IntensityType) => {
    if (type === 'percentage_tm') return `${Math.round(value * 100)}% TM`
    if (type === 'percentage_1rm') return `${Math.round(value * 100)}% 1RM`
    if (type === 'percentage_work_set') return `${Math.round(value * 100)}% first work set`
    if (type === 'rpe') return `RPE ${value}`
    if (type === 'bodyweight') return 'Bodyweight'
    return formatWeight(value, preferredUnit)
  }

  const formatSetSummarySuffix = (set: SetPrescription) => {
    const descriptors = [
      set.purpose === 'warmup' ? 'warm-up' : null,
      formatSetDisplayLabel(set.display_type),
    ].filter((value): value is string => Boolean(value))

    return descriptors.length > 0 ? ` - ${descriptors.join(', ')}` : ''
  }

  const renderDayCard = (day: DayTemplate, dayIndex: number, key: string) => (
    <div key={key} className="flex flex-col gap-3 rounded-[24px] border border-border/70 bg-card/82 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold text-primary">
          {dayIndex + 1}
        </span>
        <h4 className="text-sm font-medium text-foreground">{day.label}</h4>
        <span className="text-xs text-muted-foreground">
          {day.exercise_blocks.length} exercise{day.exercise_blocks.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex flex-col gap-3 sm:pl-9">
        {day.exercise_blocks.map((block, blockIndex) => (
          <div key={blockIndex} className="flex flex-col gap-2 rounded-[18px] bg-background/60 p-3 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{block.exercise_key || 'Unnamed exercise'}</span>
              <span className="text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
                {BLOCK_ROLE_LABELS[block.role]}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {block.sets.map((set, setIndex) => (
                <span key={setIndex} className="rounded-full bg-muted px-2.5 py-1 text-foreground">
                  {set.sets}x{set.reps} at {formatIntensity(set.intensity, set.intensity_type)}
                  {formatSetSummarySuffix(set)}
                  {typeof set.rest_seconds === 'number' && set.rest_seconds > 0
                    ? ` - rest ${formatRestDurationLabel(set.rest_seconds)}`
                    : ''}
                </span>
              ))}
            </div>
            {block.notes ? <p className="text-xs italic text-muted-foreground">{block.notes}</p> : null}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-[24px] border border-border/70 bg-card/82 p-4 shadow-sm">
        <h3 className="text-lg font-semibold tracking-[-0.04em] text-foreground">{draft.name}</h3>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>{formatDaysPerWeek(draft.days_per_week)}</span>
          <span>{formatWeekCycle(draft.cycle_length_weeks)}</span>
          <span>Method: {methodLabel}</span>
          <span>Progression: {STYLE_LABELS[draft.progression.style]}</span>
          {draft.uses_training_max ? <span>TM working percentage: {Math.round(draft.tm_percentage * 100)}%</span> : null}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {showPerWeekStructure
          ? weeklyStructure.map((week) => (
              <div key={`review-week-${week.weekNumber}`} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-1 pt-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Week {week.weekNumber}
                  </span>
                  <span className="text-sm font-medium text-foreground">{week.label}</span>
                </div>
                {week.days.map((day, dayIndex) =>
                  renderDayCard(day, dayIndex, `review-week-${week.weekNumber}-day-${dayIndex}`),
                )}
              </div>
            ))
          : draft.days.map((day, dayIndex) => renderDayCard(day, dayIndex, `review-day-${dayIndex}`))}
      </div>

      <div className="rounded-[24px] border border-border/70 bg-card/82 p-4 text-sm text-muted-foreground shadow-sm">
        <p className="mb-2 text-sm font-medium text-foreground">Progression</p>
        <p>Style: {STYLE_LABELS[draft.progression.style]}</p>
        {progressionIncrements ? (
          <p>
            Upper: +{formatWeight(progressionIncrements.upper, preferredUnit)} - Lower: +{formatWeight(progressionIncrements.lower, preferredUnit)}
          </p>
        ) : null}
        <p>Deload decisions stay manual and happen during the current cycle checkpoint.</p>
      </div>

      {requiresMaxInputs ? (
        <div className="flex flex-col gap-3">
          <TrainingMaxPanel
            title={requiredInputCopy.title}
            description={requiredInputCopy.description}
            badgeLabel={requiredInputCopy.badgeLabel}
            emptyStateHint={requiredInputCopy.emptyStateHint}
            inputMode={maxInputScope.inputMode}
            targetExerciseIds={maxInputScope.exerciseIds}
            targetExerciseKeys={maxInputScope.exerciseKeys}
          />
          <div className="rounded-[24px] border border-border/70 bg-card/82 p-4 text-sm text-muted-foreground shadow-sm">
            {isTrainingMaxStateLoading ? (
              <p>{requiredInputCopy.loadingMessage}</p>
            ) : isTrainingMaxRequirementMet ? (
              <p>{requiredInputCopy.readyMessage}</p>
            ) : (
              <p>{requiredInputCopy.missingActionMessage} {missingMaxInputNames.join(', ')} before you save this program.</p>
            )}
          </div>
        </div>
      ) : null}

      {saveStrategy === 'revision' ? (
        <div className="rounded-[24px] border border-amber-500/30 bg-amber-500/8 p-4 text-sm text-amber-950 shadow-sm dark:text-amber-100">
          This program already has workout history, so saving here will create a new editable revision instead of rewriting past training data.
        </div>
      ) : showHistoryPreservationNote ? (
        <div className="rounded-[24px] border border-amber-500/30 bg-amber-500/8 p-4 text-sm text-amber-950 shadow-sm dark:text-amber-100">
          Completed cycles keep their saved program snapshots. If the current cycle already has logged workouts, these edits roll forward on the next cycle instead of rewriting that logged work.
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep('progression')} className="flex-1">
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={isSaveDisabled} className="flex-1">
          {isPending
            ? saveStrategy === 'update'
              ? 'Saving...'
              : saveStrategy === 'revision'
                ? 'Saving revision...'
                : 'Creating...'
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
