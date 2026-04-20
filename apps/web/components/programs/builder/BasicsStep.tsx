'use client'

import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { useState } from 'react'
import { validateCustomProgramBasicsStep } from '@/lib/validations/program'
import {
  resolveBuilderProgrammingMethod,
  useBuilderDraftStore,
  usesTrainingMaxForMethod,
  type BuilderProgrammingMethod,
} from '@/store/builderDraftStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const DAYS_PER_WEEK_OPTIONS = [1, 2, 3, 4, 5, 6, 7].map((value) => ({
  value: String(value),
  label: String(value),
}))

const CYCLE_LENGTH_OPTIONS = Array.from({ length: 16 }, (_, index) => {
  const value = index + 1

  return {
    value: String(value),
    label: `${value} week${value > 1 ? 's' : ''}`,
  }
})

const TM_PERCENTAGE_OPTIONS = [
  { value: '0.85', label: '85%' },
  { value: '0.875', label: '87.5%' },
  { value: '0.9', label: '90%' },
  { value: '0.925', label: '92.5%' },
  { value: '0.95', label: '95%' },
]

const METHOD_OPTIONS: Array<{
  value: BuilderProgrammingMethod
  label: string
  description: string
}> = [
  {
    value: 'general',
    label: 'General Program',
    description: 'Keep the builder centered on flexible loading, effort, bodyweight, or fixed-weight work without making training max the default frame.',
  },
  {
    value: 'tm_driven',
    label: 'Training-Max Driven',
    description: 'Center the builder on training-max percentages and keep TM-specific setup visible where the method depends on it.',
  },
]

export function BasicsStep() {
  const { draft, patchDraft, setStep, source } = useBuilderDraftStore()
  const [error, setError] = useState<string | null>(null)
  const selectedMethod = resolveBuilderProgrammingMethod(draft.uses_training_max)
  const isDerivedMethod = source?.template_key !== undefined && source.template_key !== 'custom'
  const methodLabel = METHOD_OPTIONS.find((option) => option.value === selectedMethod)?.label ?? 'General Program'

  const handleNext = () => {
    const validationError = validateCustomProgramBasicsStep(draft.name)

    if (validationError) {
      setError(validationError)
      return
    }

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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Program Name</Label>
        <Input
          id="name"
          placeholder="My Four-Day Split"
          value={draft.name}
          onChange={(e) => {
            patchDraft({ name: e.target.value })
            setError(null)
          }}
          autoFocus
          aria-invalid={!!error}
          aria-describedby={error ? 'builder-basics-error' : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="dpw">Days per Week</Label>
          <Select
            value={String(draft.days_per_week)}
            onValueChange={(value) => {
              patchDraft({ days_per_week: Number(value) })
              setError(null)
            }}
            items={DAYS_PER_WEEK_OPTIONS}
          >
            <SelectTrigger id="dpw" className="w-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {DAYS_PER_WEEK_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="clw">Cycle Length</Label>
          <Select
            value={String(draft.cycle_length_weeks)}
            onValueChange={(value) => {
              patchDraft({ cycle_length_weeks: Number(value) })
              setError(null)
            }}
            items={CYCLE_LENGTH_OPTIONS}
          >
            <SelectTrigger id="clw" className="w-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {CYCLE_LENGTH_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Programming Method</Label>
        {isDerivedMethod ? (
          <div className="rounded-[20px] border border-border/70 bg-card/70 p-3">
            <p className="text-sm font-medium text-foreground">{methodLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Derived from the source template so this builder stays aligned with the program&apos;s original loading model.
            </p>
          </div>
        ) : (
          <RadioGroup
            value={selectedMethod}
            aria-label="Programming method"
            onValueChange={(value) => {
              patchDraft({ uses_training_max: usesTrainingMaxForMethod(value as BuilderProgrammingMethod) })
              setError(null)
            }}
            className="flex flex-col gap-2"
          >
            {METHOD_OPTIONS.map((option) => (
              <Radio.Root
                key={option.value}
                value={option.value}
                nativeButton
                render={<button />}
                className="w-full rounded-xl border border-border/70 bg-card/70 p-3 text-left transition-colors motion-reduce:transition-none outline-none hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-checked:border-primary aria-checked:bg-primary/5 aria-checked:ring-1 aria-checked:ring-primary/30"
              >
                <p className="text-sm font-medium text-foreground">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </Radio.Root>
            ))}
          </RadioGroup>
        )}

        {!isDerivedMethod && !draft.uses_training_max && (
          <p className="text-xs leading-5 text-muted-foreground">
            You can still choose fixed-weight, bodyweight, effort-based, or other non-TM prescriptions later at the exercise level.
          </p>
        )}

        {draft.uses_training_max && (
          <div className="grid grid-cols-1 gap-4 animate-slide-up motion-reduce:animate-none">
            <div className="flex flex-col gap-2 max-w-xs">
              <Label htmlFor="tmp">Training Max Working Percentage</Label>
              <Select
                value={String(draft.tm_percentage)}
                onValueChange={(value) => {
                  patchDraft({ tm_percentage: Number(value) })
                  setError(null)
                }}
                items={TM_PERCENTAGE_OPTIONS}
              >
                <SelectTrigger id="tmp" className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {TM_PERCENTAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This stays visible only for TM-driven methods so the builder does not over-center training max for every program.
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p id="builder-basics-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button onClick={handleNext} className="w-full">
        Next
      </Button>
    </div>
  )
}
