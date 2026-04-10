'use client'

import { cn } from '@/lib/utils'
import type { BuilderStep } from '@/store/builderDraftStore'

const STEPS: { key: BuilderStep; label: string }[] = [
  { key: 'basics', label: 'Basics' },
  { key: 'days', label: 'Days' },
  { key: 'exercises', label: 'Exercises' },
  { key: 'progression', label: 'Progression' },
  { key: 'review', label: 'Review' },
]

interface BuilderStepperProps {
  currentStep: BuilderStep
  totalDays?: number
  currentDayIndex?: number
}

export function BuilderStepper({ currentStep, totalDays, currentDayIndex }: BuilderStepperProps) {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStep)
  const stepNumber = currentIdx + 1

  return (
    <div className="space-y-2">
      {/* Mobile: compact */}
      <div className="flex items-center justify-between md:hidden">
        <p className="text-sm font-medium">
          Step {stepNumber} of {STEPS.length}
          {currentStep === 'exercises' && totalDays ? ` — Day ${(currentDayIndex ?? 0) + 1}/${totalDays}` : ''}
        </p>
        <p className="text-xs text-muted-foreground">{STEPS[currentIdx].label}</p>
      </div>

      {/* Desktop: full stepper */}
      <div className="hidden md:flex items-center gap-1">
        {STEPS.map((step, i) => {
          const isActive = i === currentIdx
          const isCompleted = i < currentIdx
          return (
            <div key={step.key} className="flex items-center gap-1 flex-1">
              <div className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    isActive && 'bg-primary text-primary-foreground',
                    isCompleted && 'bg-primary/20 text-primary',
                    !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? '✓' : i + 1}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium whitespace-nowrap',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-px flex-1 min-w-4',
                    i < currentIdx ? 'bg-primary/40' : 'bg-border'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${(stepNumber / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  )
}
