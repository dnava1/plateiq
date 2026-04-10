'use client'

import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { displayToLbs, formatUnit, lbsToDisplay } from '@/lib/utils'
import { useBuilderDraftStore } from '@/store/builderDraftStore'
import { DEFAULT_LINEAR_INCREMENT_LBS, usesLinearProgression } from '@/store/builderDraftStore'
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

const showIncrements = (style: ProgressionStyle) => usesLinearProgression(style)

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
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted-foreground">
          How should weights increase over time?
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Progression Style</Label>
        <RadioGroup
          value={prog.style}
          aria-label="Progression style"
          onValueChange={(value) => {
            const style = value as ProgressionStyle
            update({
              style,
              increment_lbs: usesLinearProgression(style)
                ? prog.increment_lbs ?? { ...DEFAULT_LINEAR_INCREMENT_LBS }
                : prog.increment_lbs,
            })
          }}
          className="flex flex-col gap-2"
        >
          {STYLE_OPTIONS.map((opt) => (
            <Radio.Root
              key={opt.value}
              value={opt.value}
              nativeButton
              render={<button />}
              className="w-full rounded-xl border border-border/70 bg-card/70 p-3 text-left transition-colors motion-reduce:transition-none outline-none hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-checked:border-primary aria-checked:bg-primary/5 aria-checked:ring-1 aria-checked:ring-primary/30"
            >
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </Radio.Root>
          ))}
        </RadioGroup>
      </div>

      {showIncrements(prog.style) && (
        <div className="flex flex-col gap-3 animate-slide-up motion-reduce:animate-none">
          <Label>Weight Increments ({formatUnit(preferredUnit)})</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
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
            <div className="flex flex-col gap-1.5">
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="deload-trigger">Deload Trigger (optional)</Label>
        <Input
          id="deload-trigger"
          placeholder="e.g. 2 missed sessions in a row"
          value={prog.deload_trigger ?? ''}
          onChange={(e) => update({ deload_trigger: e.target.value || undefined })}
          className="text-sm"
        />
      </div>

      <div className="flex flex-col gap-2">
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
