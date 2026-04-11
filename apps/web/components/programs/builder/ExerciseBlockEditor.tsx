'use client'

import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { displayToLbs, formatUnit, lbsToDisplay } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
  supplement: 'Variation',
  accessory: 'Accessory',
}

const INTENSITY_LABELS: Record<IntensityType, string> = {
  percentage_tm: '% TM',
  percentage_1rm: '% 1RM',
  rpe: 'RPE',
  fixed_weight: 'Weight',
  bodyweight: 'BW',
  percentage_work_set: '% Work',
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

export function ExerciseBlockEditor({ block, index, usesTrainingMax, onChange, onRemove }: ExerciseBlockEditorProps) {
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
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
            {index + 1}
          </span>
          <NativeSelect
            wrapperClassName="w-auto shrink-0"
            className="h-8 w-auto min-w-28 pr-7 text-xs font-medium"
            value={block.role}
            onChange={(e) => onChange({ ...block, role: e.target.value as ExerciseBlock['role'] })}
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </NativeSelect>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div>
        <Input
          placeholder="Exercise name (e.g. Squat, Bench Press)"
          value={block.exercise_key ?? ''}
          onChange={(e) => onChange({ ...block, exercise_key: e.target.value || undefined })}
          className="text-sm"
        />
      </div>

      {/* Sets table */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-1">
          <span>Sets</span>
          <span>Reps</span>
          <span>Intensity</span>
          <span>Type</span>
          <span></span>
        </div>
        {block.sets.map((set, si) => (
          <div key={si} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-1.5 items-center">
            <Input
              type="number"
              min={1}
              max={20}
              value={set.sets}
              onChange={(e) => updateSet(si, {
                sets: Math.min(MAX_SET_COUNT, Math.max(MIN_SET_COUNT, Number(e.target.value))),
              })}
              className="h-8 text-xs text-center"
            />
            <Input
              value={String(set.reps)}
              onChange={(e) => {
                const val = e.target.value
                const asNum = Number(val)
                updateSet(si, { reps: !isNaN(asNum) && val === String(asNum) ? asNum : val, is_amrap: val.endsWith('+') })
              }}
              placeholder="5 or 5+"
              className="h-8 text-xs text-center"
            />
            <Input
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
              onChange={(e) => updateSet(si, {
                intensity: Math.min(
                  MAX_INTENSITY,
                  Math.max(
                    MIN_INTENSITY,
                    set.intensity_type === 'fixed_weight'
                      ? displayToLbs(Number(e.target.value), preferredUnit)
                      : Number(e.target.value),
                  ),
                ),
              })}
              className="h-8 text-xs text-center"
            />
            <NativeSelect
              wrapperClassName="w-auto"
              className="h-8 w-auto min-w-24 pr-7 text-[10px]"
              value={set.intensity_type}
              onChange={(e) => {
                const nextType = e.target.value as IntensityType
                updateSet(si, {
                  intensity_type: nextType,
                  intensity: getDefaultIntensity(nextType),
                })
              }}
            >
              {Object.entries(INTENSITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{k === 'fixed_weight' ? `${v} (${formatUnit(preferredUnit)})` : v}</option>
              ))}
            </NativeSelect>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => removeSet(si)}
              disabled={block.sets.length <= 1}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addSet} className="text-xs text-primary w-full">
          + Add Set
        </Button>
      </div>

      <div>
        <Input
          placeholder="Notes (optional)"
          value={block.notes ?? ''}
          onChange={(e) => onChange({ ...block, notes: e.target.value || undefined })}
          className="text-xs"
        />
      </div>
    </div>
  )
}
