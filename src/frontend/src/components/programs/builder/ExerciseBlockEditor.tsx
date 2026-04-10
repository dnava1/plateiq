'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import type { SetPrescription, ExerciseBlock } from '@/types/template'
import type { IntensityType } from '@/types/domain'

const INTENSITY_LABELS: Record<IntensityType, string> = {
  percentage_tm: '% TM',
  percentage_1rm: '% 1RM',
  rpe: 'RPE',
  fixed_weight: 'lbs',
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

export function ExerciseBlockEditor({ block, index, usesTrainingMax, onChange, onRemove }: ExerciseBlockEditorProps) {
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
          <select
            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={block.role}
            onChange={(e) => onChange({ ...block, role: e.target.value as ExerciseBlock['role'] })}
          >
            <option value="primary">Primary</option>
            <option value="supplement">Supplement</option>
            <option value="accessory">Accessory</option>
          </select>
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
              onChange={(e) => updateSet(si, { sets: Math.max(1, Number(e.target.value)) })}
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
              step={set.intensity_type === 'rpe' ? 0.5 : set.intensity_type.startsWith('percentage') ? 0.01 : 5}
              value={set.intensity}
              onChange={(e) => updateSet(si, { intensity: Number(e.target.value) })}
              className="h-8 text-xs text-center"
            />
            <select
              className="h-8 rounded-md border border-input bg-transparent px-1 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={set.intensity_type}
              onChange={(e) => updateSet(si, { intensity_type: e.target.value as IntensityType })}
            >
              {Object.entries(INTENSITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
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
