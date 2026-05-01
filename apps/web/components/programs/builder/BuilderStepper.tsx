'use client'

import { Check } from 'lucide-react'
import { BUILDER_STEPS } from '@/lib/programs/builderNavigation'
import { cn } from '@/lib/utils'
import type { BuilderStep } from '@/store/builderDraftStore'

interface BuilderStepperProps {
  currentStep: BuilderStep
  totalDays?: number
  currentDayIndex?: number
  onStepSelect?: (step: BuilderStep) => void
}

export function BuilderStepper({
  currentStep,
  totalDays,
  currentDayIndex,
  onStepSelect,
}: BuilderStepperProps) {
  const currentIdx = BUILDER_STEPS.findIndex((step) => step.key === currentStep)
  const stepNumber = currentIdx + 1

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between md:hidden">
        <p className="text-sm font-medium text-foreground">
          Step {stepNumber} of {BUILDER_STEPS.length}
          {currentStep === 'exercises' && totalDays ? ` - Session ${(currentDayIndex ?? 0) + 1}/${totalDays}` : ''}
        </p>
        <p className="text-xs text-muted-foreground">{BUILDER_STEPS[currentIdx].label}</p>
      </div>

      <div className="flex w-full min-w-0 max-w-full touch-pan-x gap-2 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] md:hidden">
        {BUILDER_STEPS.map((step, index) => {
          const isActive = index === currentIdx
          const isCompleted = index < currentIdx

          return (
            <button
              key={step.key}
              type="button"
              onClick={() => onStepSelect?.(step.key)}
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                isActive && 'border-primary/40 bg-primary/10 text-foreground',
                isCompleted && 'border-primary/30 bg-primary/5 text-foreground',
                !isActive && !isCompleted && 'border-border bg-background text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-semibold',
                  isActive && 'bg-primary text-primary-foreground',
                  isCompleted && 'bg-primary/15 text-primary',
                  !isActive && !isCompleted && 'bg-muted text-muted-foreground',
                )}
              >
                {isCompleted ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span className="text-xs font-medium whitespace-nowrap">{step.label}</span>
            </button>
          )
        })}
      </div>

      <div className="hidden items-center gap-1 md:flex">
        {BUILDER_STEPS.map((step, index) => {
          const isActive = index === currentIdx
          const isCompleted = index < currentIdx

          return (
            <div key={step.key} className="flex flex-1 items-center gap-1">
              <button
                type="button"
                onClick={() => onStepSelect?.(step.key)}
                aria-current={isActive ? 'step' : undefined}
                className="flex flex-1 items-center gap-2 rounded-xl p-1 text-left outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors motion-reduce:transition-none',
                    isActive && 'bg-primary text-primary-foreground',
                    isCompleted && 'bg-primary/20 text-primary',
                    !isActive && !isCompleted && 'bg-muted text-muted-foreground',
                  )}
                >
                  {isCompleted ? <Check className="size-4" /> : index + 1}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium whitespace-nowrap',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </button>
              {index < BUILDER_STEPS.length - 1 ? (
                <div
                  className={cn(
                    'h-px flex-1 min-w-4',
                    index < currentIdx ? 'bg-primary/40' : 'bg-border',
                  )}
                />
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${(stepNumber / BUILDER_STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  )
}
