'use client'

import { useBuilderDraftStore } from '@/store/builderDraftStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ProgramLevel } from '@/types/domain'

export function BasicsStep() {
  const { draft, patchDraft, setStep } = useBuilderDraftStore()

  const handleNext = () => {
    if (!draft.name.trim()) return
    // Initialize day labels if needed
    if (draft.days.length !== draft.days_per_week) {
      const days = Array.from({ length: draft.days_per_week }, (_, i) => ({
        label: draft.days[i]?.label ?? `Day ${i + 1}`,
        exercise_blocks: draft.days[i]?.exercise_blocks ?? [],
      }))
      patchDraft({ days })
    }
    setStep('days')
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Program Name</Label>
        <Input
          id="name"
          placeholder="My Custom Program"
          value={draft.name}
          onChange={(e) => patchDraft({ name: e.target.value })}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="level">Experience Level</Label>
        <select
          id="level"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={draft.level ?? ''}
          onChange={(e) => patchDraft({ level: (e.target.value || undefined) as ProgramLevel | undefined })}
        >
          <option value="">Any level</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dpw">Days per Week</Label>
          <select
            id="dpw"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={draft.days_per_week}
            onChange={(e) => patchDraft({ days_per_week: Number(e.target.value) })}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clw">Cycle Length (weeks)</Label>
          <select
            id="clw"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={draft.cycle_length_weeks}
            onChange={(e) => patchDraft({ cycle_length_weeks: Number(e.target.value) })}
          >
            {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n} week{n > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={draft.uses_training_max}
            onClick={() => patchDraft({ uses_training_max: !draft.uses_training_max })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${draft.uses_training_max ? 'bg-primary' : 'bg-muted'}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${draft.uses_training_max ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
          <Label className="cursor-pointer" onClick={() => patchDraft({ uses_training_max: !draft.uses_training_max })}>
            Use Training Maxes
          </Label>
        </div>

        {draft.uses_training_max && (
          <div className="grid grid-cols-2 gap-4 animate-slide-up">
            <div className="space-y-2">
              <Label htmlFor="tmp">TM Percentage</Label>
              <select
                id="tmp"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={draft.tm_percentage}
                onChange={(e) => patchDraft({ tm_percentage: Number(e.target.value) })}
              >
                <option value={0.85}>85%</option>
                <option value={0.875}>87.5%</option>
                <option value={0.9}>90%</option>
                <option value={0.925}>92.5%</option>
                <option value={0.95}>95%</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rnd">Rounding (lbs)</Label>
              <select
                id="rnd"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={draft.rounding}
                onChange={(e) => patchDraft({ rounding: Number(e.target.value) })}
              >
                <option value={2.5}>2.5 lbs</option>
                <option value={5}>5 lbs</option>
                <option value={10}>10 lbs</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <Button onClick={handleNext} disabled={!draft.name.trim()} className="w-full">
        Next
      </Button>
    </div>
  )
}
