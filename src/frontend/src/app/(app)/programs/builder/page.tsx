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
import { Button } from '@/components/ui/button'
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
    <div className="page-shell mx-auto w-full max-w-3xl">
      <section className="page-header">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Custom Builder</span>
          <div className="flex flex-col gap-2">
            <h1 className="page-title">Build Custom Program</h1>
            <p className="page-copy">
              Define your own structure, exercises, and progression without losing the clean PlateIQ workflow.
            </p>
          </div>
        </div>

        <Link href="/programs">
          <Button variant="outline" size="lg">
            <ArrowLeft data-icon="inline-start" />
            Back to Programs
          </Button>
        </Link>
      </section>

      <Card className="surface-panel">
        <CardHeader className="gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <WandSparkles />
            </div>
            <CardTitle className="text-xl">Custom Program Wizard</CardTitle>
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
