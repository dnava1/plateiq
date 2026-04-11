'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useBuilderDraftStore } from '@/store/builderDraftStore'
import { BuilderStepper } from '@/components/programs/builder/BuilderStepper'
import { BasicsStep } from '@/components/programs/builder/BasicsStep'
import { DaysStep } from '@/components/programs/builder/DaysStep'
import { ExercisesStep } from '@/components/programs/builder/ExercisesStep'
import { ProgressionStep } from '@/components/programs/builder/ProgressionStep'
import { ReviewStep } from '@/components/programs/builder/ReviewStep'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, WandSparkles } from 'lucide-react'

export default function BuilderPage() {
  const { step, currentDayIndex, draft, resetDraft } = useBuilderDraftStore()

  // Reset on mount
  useEffect(() => {
    resetDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="page-shell max-w-5xl">
      <section className="page-header">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Program Builder</span>
          <div className="flex flex-col gap-2">
            <h1 className="page-title">Build a Program</h1>
            <p className="page-copy">
              Set up your split, name each day, and dial in progression without fighting the form.
            </p>
          </div>
        </div>

        <Link href="/programs" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          <ArrowLeft data-icon="inline-start" />
          Back to Programs
        </Link>
      </section>

      <Card className="surface-panel w-full max-w-3xl">
        <CardHeader className="gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <WandSparkles />
            </div>
            <CardTitle className="text-xl">Program Setup</CardTitle>
          </div>
          <BuilderStepper
            currentStep={step}
            totalDays={draft.days.length}
            currentDayIndex={currentDayIndex}
          />
        </CardHeader>

        <CardContent className="animate-fade-in">
          {step === 'basics' && <BasicsStep />}
          {step === 'days' && <DaysStep />}
          {step === 'exercises' && <ExercisesStep />}
          {step === 'progression' && <ProgressionStep />}
          {step === 'review' && <ReviewStep />}
        </CardContent>
      </Card>
    </div>
  )
}
