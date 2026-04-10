'use client'

import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { displayToLbs, formatUnit, lbsToDisplay } from '@/lib/utils'
import { useBuilderDraftStore } from '@/store/builderDraftStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ProgressionRule } from '@/types/template'
import type { ProgressionStyle } from '@/types/domain'

const STYLE_OPTIONS: { value: ProgressionStyle; label: string; description: string }[] = [
  { value: 'linear_per_session', label: 'Linear per Session', description: 'Add weight every session' },
  { value: 'linear_per_week', label: 'Linear per Week', description: 'Add weight weekly' },
  { value: 'linear_per_cycle', label: 'Linear per Cycle', description: 'Add weight each cycle' },
  { value: 'percentage_cycle', label: 'Percentage Cycle', description: 'Increase by percentage each cycle' },
  { value: 'wave', label: 'Wave Loading', description: 'Undulating intensity across weeks' },
  { value: 'autoregulated', label: 'Autoregulated', description: 'Adjust based on RPE/AMRAP performance' },
  { value: 'custom', label: 'Custom', description: 'Define your own rules' },
]

const showIncrements = (style: ProgressionStyle) =>
  ['linear_per_session', 'linear_per_week', 'linear_per_cycle'].includes(style)

const MAX_INCREMENT_LBS = 50
const MIN_INCREMENT_LBS = 0

export function ProgressionStep() {
  const { draft, patchDraft, setStep } = useBuilderDraftStore()
  const preferredUnit = usePreferredUnit()
  const prog = draft.progression
  const upperDisplay = lbsToDisplay(prog.increment_lbs?.upper ?? 5, preferredUnit)
  const lowerDisplay = lbsToDisplay(prog.increment_lbs?.lower ?? 10, preferredUnit)
  const maxDisplayIncrement = lbsToDisplay(MAX_INCREMENT_LBS, preferredUnit)

  const clampIncrement = (value: number) => Math.min(Math.max(value, MIN_INCREMENT_LBS), MAX_INCREMENT_LBS)

  const update = (patch: Partial<ProgressionRule>) => {
    patchDraft({ progression: { ...prog, ...patch } })
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          How should weights increase over time?
        </p>
      </div>

      <div className="space-y-2">
        <Label>Progression Style</Label>
        <div className="space-y-2">
          {STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ style: opt.value })}
              className={`w-full rounded-xl border p-3 text-left transition-all ${
                prog.style === opt.value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'hover:bg-muted/50'
              }`}
            >
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {showIncrements(prog.style) && (
        <div className="space-y-3 animate-slide-up">
          <Label>Weight Increments ({formatUnit(preferredUnit)})</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inc-upper" className="text-xs text-muted-foreground">Upper Body</Label>
              <Input
                id="inc-upper"
                type="number"
                min={0}
                max={maxDisplayIncrement}
                step={preferredUnit === 'kg' ? 0.5 : 2.5}
                value={upperDisplay}
                onChange={(e) => update({
                  increment_lbs: {
                    upper: clampIncrement(displayToLbs(Number(e.target.value), preferredUnit)),
                    lower: prog.increment_lbs?.lower ?? 10,
                  },
                })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inc-lower" className="text-xs text-muted-foreground">Lower Body</Label>
              <Input
                id="inc-lower"
                type="number"
                min={0}
                max={maxDisplayIncrement}
                step={preferredUnit === 'kg' ? 0.5 : 2.5}
                value={lowerDisplay}
                onChange={(e) => update({
                  increment_lbs: {
                    upper: prog.increment_lbs?.upper ?? 5,
                    lower: clampIncrement(displayToLbs(Number(e.target.value), preferredUnit)),
                  },
                })}
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="deload-trigger">Deload Trigger (optional)</Label>
        <Input
          id="deload-trigger"
          placeholder="e.g. 2 missed sessions in a row"
          value={prog.deload_trigger ?? ''}
          onChange={(e) => update({ deload_trigger: e.target.value || undefined })}
          className="text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="deload-strategy">Deload Strategy (optional)</Label>
        <Input
          id="deload-strategy"
          placeholder="e.g. Reduce volume 50% for 1 week"
          value={prog.deload_strategy ?? ''}
          onChange={(e) => update({ deload_strategy: e.target.value || undefined })}
          className="text-sm"
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep('exercises')} className="flex-1">
          Back
        </Button>
        <Button onClick={() => setStep('review')} className="flex-1">
          Review
        </Button>
      </div>
    </div>
  )
}
