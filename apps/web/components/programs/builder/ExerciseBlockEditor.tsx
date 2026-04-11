'use client'

import { useId } from 'react'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { displayToLbs, formatUnit, lbsToDisplay } from '@/lib/utils'
import { ExerciseLibraryField } from './ExerciseLibraryField'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Trash2 } from 'lucide-react'
import type { SetPrescription, ExerciseBlock } from '@/types/template'
import type { IntensityType } from '@/types/domain'

const MIN_SET_COUNT = 1
const MAX_SET_COUNT = 20
const MIN_INTENSITY = 0
const MAX_INTENSITY = 10000

const ROLE_LABELS: Record<ExerciseBlock['role'], string> = {
  primary: 'Primary',
  supplement: 'Supplement',
  accessory: 'Accessory',
}

const LOAD_BASIS_LABELS: Record<IntensityType, string> = {
  percentage_tm: 'Training max %',
  percentage_1rm: '1RM %',
  rpe: 'RPE',
  fixed_weight: 'Fixed load',
  bodyweight: 'Bodyweight',
  percentage_work_set: 'Work set %',
}

interface ExerciseBlockEditorProps {
  block: ExerciseBlock
  index: number
  usesTrainingMax: boolean
  onChange: (block: ExerciseBlock) => void
  onRemove: () => void
}

function getDefaultIntensity(type: IntensityType): number {
  if (type === 'fixed_weight') return 135
  if (type === 'rpe') return 7
  if (type === 'percentage_work_set') return 1
  if (type === 'bodyweight') return 0
  return 0.75
}

function getSafeNumber(value: string, fallback: number) {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? nextValue : fallback
}

export function ExerciseBlockEditor({ block, index, usesTrainingMax, onChange, onRemove }: ExerciseBlockEditorProps) {
  const fieldId = useId()
  const preferredUnit = usePreferredUnit()

  const updateSet = (setIdx: number, patch: Partial<SetPrescription>) => {
    const sets = [...block.sets]
    sets[setIdx] = { ...sets[setIdx], ...patch }
    onChange({ ...block, sets })
  }

  const addSet = () => {
    const lastSet = block.sets[block.sets.length - 1]
    const newSet: SetPrescription = lastSet
      ? { ...lastSet }
      : { sets: 3, reps: 5, intensity: usesTrainingMax ? 0.75 : 135, intensity_type: usesTrainingMax ? 'percentage_tm' : 'fixed_weight' }
    onChange({ ...block, sets: [...block.sets, newSet] })
  }

  const removeSet = (setIdx: number) => {
    if (block.sets.length <= 1) return
    onChange({ ...block, sets: block.sets.filter((_, i) => i !== setIdx) })
  }

  return (
    <section className="flex flex-col gap-4 rounded-[24px] border border-border/70 bg-card/82 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
            {index + 1}
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">Exercise Block</p>
            <p className="text-xs leading-5 text-muted-foreground">
              Choose the exercise, set the role, then define the load prescription.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label={`Remove exercise block ${index + 1}`}
        >
          <Trash2 />
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_12rem]">
        <ExerciseLibraryField
          selectedExerciseId={block.exercise_id}
          value={block.exercise_key}
          defaultCategory={block.role === 'primary' ? 'main' : 'accessory'}
          onSelect={({ exerciseId, exerciseName }) => onChange({
            ...block,
            exercise_id: exerciseId,
            exercise_key: exerciseName || undefined,
          })}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${fieldId}-role`}>Block Role</Label>
          <NativeSelect
            id={`${fieldId}-role`}
            className="h-9"
            value={block.role}
            onChange={(event) => onChange({ ...block, role: event.target.value as ExerciseBlock['role'] })}
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[20px] border border-border/70 bg-background/55 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">Prescription</p>
            <p className="text-xs leading-5 text-muted-foreground">
              Define the set targets and the load basis for each line.
            </p>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={addSet}>
            Add Set
          </Button>
        </div>

        <div className="hidden grid-cols-[minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto] gap-2 px-1 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground md:grid">
          <span>Sets</span>
          <span>Reps</span>
          <span>Load</span>
          <span>Load Basis</span>
          <span className="sr-only">Remove</span>
        </div>
        <div className="flex flex-col gap-3">
          {block.sets.map((set, si) => (
            <div
              key={si}
              className="grid gap-3 rounded-[18px] border border-border/70 bg-card p-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto] md:items-end"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${fieldId}-sets-${si}`} className="text-xs md:sr-only">Sets</Label>
                <Input
                  id={`${fieldId}-sets-${si}`}
                  type="number"
                  min={1}
                  max={20}
                  value={set.sets}
                  onChange={(event) => updateSet(si, {
                    sets: Math.min(
                      MAX_SET_COUNT,
                      Math.max(MIN_SET_COUNT, getSafeNumber(event.target.value, set.sets)),
                    ),
                  })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor={`${fieldId}-reps-${si}`} className="text-xs md:sr-only">Reps</Label>
                <Input
                  id={`${fieldId}-reps-${si}`}
                  value={String(set.reps)}
                  onChange={(event) => {
                    const value = event.target.value
                    const numericValue = Number(value)

                    updateSet(si, {
                      reps: Number.isNaN(numericValue) || value !== String(numericValue) ? value : numericValue,
                      is_amrap: value.endsWith('+'),
                    })
                  }}
                  placeholder="5 or 5+"
                  className="h-9 text-sm"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor={`${fieldId}-load-${si}`} className="text-xs md:sr-only">Load</Label>
                <Input
                  id={`${fieldId}-load-${si}`}
                  type="number"
                  step={
                    set.intensity_type === 'rpe'
                      ? 0.5
                      : set.intensity_type.startsWith('percentage')
                        ? 0.01
                        : preferredUnit === 'kg'
                          ? 2.5
                          : 5
                  }
                  value={set.intensity_type === 'fixed_weight' ? lbsToDisplay(set.intensity, preferredUnit) : set.intensity}
                  onChange={(event) => {
                    const rawValue = getSafeNumber(
                      event.target.value,
                      set.intensity_type === 'fixed_weight' ? lbsToDisplay(set.intensity, preferredUnit) : set.intensity,
                    )

                    updateSet(si, {
                      intensity: Math.min(
                        MAX_INTENSITY,
                        Math.max(
                          MIN_INTENSITY,
                          set.intensity_type === 'fixed_weight'
                            ? displayToLbs(rawValue, preferredUnit)
                            : rawValue,
                        ),
                      ),
                    })
                  }}
                  className="h-9 text-sm"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor={`${fieldId}-basis-${si}`} className="text-xs md:sr-only">Load Basis</Label>
                <NativeSelect
                  id={`${fieldId}-basis-${si}`}
                  className="h-9"
                  value={set.intensity_type}
                  onChange={(event) => {
                    const nextType = event.target.value as IntensityType

                    updateSet(si, {
                      intensity_type: nextType,
                      intensity: getDefaultIntensity(nextType),
                    })
                  }}
                >
                  {Object.entries(LOAD_BASIS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {value === 'fixed_weight' ? `${label} (${formatUnit(preferredUnit)})` : label}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="self-end text-muted-foreground hover:text-destructive"
                onClick={() => removeSet(si)}
                disabled={block.sets.length <= 1}
                aria-label={`Remove set ${si + 1} from exercise block ${index + 1}`}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${fieldId}-notes`}>Notes</Label>
        <Input
          id={`${fieldId}-notes`}
          placeholder="Notes (optional)"
          value={block.notes ?? ''}
          onChange={(event) => onChange({ ...block, notes: event.target.value || undefined })}
          className="text-sm"
        />
      </div>
    </section>
  )
}
