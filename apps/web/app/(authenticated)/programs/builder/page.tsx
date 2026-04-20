'use client'

import { useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getTemplate } from '@/lib/constants/templates'
import {
  buildBuilderDraftFromProgramDefinition,
  buildEditableConfigFromTemplate,
  createProgramBuilderDraftSource,
  createScratchBuilderDraftSource,
  createTemplateBuilderDraftSource,
  resolveEditableProgramDefinition,
} from '@/lib/programs/editable'
import { useProgram, useProgramEditability } from '@/hooks/usePrograms'
import {
  createInitialBuilderDraft,
  useBuilderDraftStore,
  usesTrainingMaxForMethod,
  type BuilderProgrammingMethod,
} from '@/store/builderDraftStore'
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
  const searchParams = useSearchParams()
  const templateKey = searchParams.get('template')
  const selectedVariationKey = searchParams.get('variation')
  const requestedName = searchParams.get('name')
  const scratchMethodParam = searchParams.get('method')
  const tmParam = searchParams.get('tm')
  const tmPercentageParam = tmParam === null ? Number.NaN : Number(tmParam)
  const programIdParam = searchParams.get('programId')
  const programId = typeof programIdParam === 'string' && /^\d+$/.test(programIdParam)
    ? Number(programIdParam)
    : undefined
  const scratchMethod = scratchMethodParam === 'tm_driven' || scratchMethodParam === 'general'
    ? scratchMethodParam as BuilderProgrammingMethod
    : null
  const requestedTemplate = templateKey ? getTemplate(templateKey) ?? null : null
  const hydratedSourceKeyRef = useRef<string | null>(null)

  const { step, currentDayIndex, draft, hydrateDraft, patchSource } = useBuilderDraftStore()
  const { data: program, isLoading: isProgramLoading } = useProgram(programId)
  const { data: editability, isLoading: isEditabilityLoading } = useProgramEditability(programId)

  const hydrationKey = useMemo(() => {
    if (programId) {
      return `program:${programId}`
    }

    if (templateKey) {
      return [
        'template',
        templateKey,
        selectedVariationKey ?? '',
        requestedName?.trim() ?? '',
        Number.isFinite(tmPercentageParam) ? String(tmPercentageParam) : '',
      ].join(':')
    }

    return `scratch:${scratchMethod ?? 'default'}`
  }, [programId, requestedName, scratchMethod, selectedVariationKey, templateKey, tmPercentageParam])

  useEffect(() => {
    if (!programId || !program || !editability || hydratedSourceKeyRef.current !== `program:${programId}`) {
      return
    }

    patchSource(createProgramBuilderDraftSource(program, editability.saveStrategy))
  }, [editability, patchSource, program, programId])

  useEffect(() => {
    if (hydratedSourceKeyRef.current === hydrationKey) {
      return
    }

    if (programId) {
      if (!program || !editability) {
        return
      }

      const definition = resolveEditableProgramDefinition(program)

      if (!definition) {
        return
      }

      hydrateDraft(
        buildBuilderDraftFromProgramDefinition(program.name, definition),
        createProgramBuilderDraftSource(program, editability.saveStrategy),
      )
      hydratedSourceKeyRef.current = hydrationKey
      return
    }

    if (requestedTemplate && templateKey) {
      const definition = buildEditableConfigFromTemplate(requestedTemplate, {
        variationKey: selectedVariationKey,
        tmPercentage: Number.isFinite(tmPercentageParam) ? tmPercentageParam : null,
      })

      hydrateDraft(
        buildBuilderDraftFromProgramDefinition(requestedName?.trim() || requestedTemplate.name, definition),
        createTemplateBuilderDraftSource(templateKey),
      )
      hydratedSourceKeyRef.current = hydrationKey
      return
    }

    hydrateDraft(
      createInitialBuilderDraft({
        uses_training_max: scratchMethod ? usesTrainingMaxForMethod(scratchMethod) : false,
      }),
      createScratchBuilderDraftSource(),
    )
    hydratedSourceKeyRef.current = hydrationKey
  }, [
    editability,
    hydrateDraft,
    hydrationKey,
    patchSource,
    program,
    programId,
    requestedName,
    requestedTemplate,
    scratchMethod,
    selectedVariationKey,
    templateKey,
    tmPercentageParam,
  ])

  const builderMode = programId ? 'program' : requestedTemplate ? 'template' : 'scratch'
  const eyebrow = builderMode === 'scratch' ? 'Program Builder' : 'Program Editor'
  const pageTitle = builderMode === 'scratch'
    ? 'Build a Program'
    : builderMode === 'template'
      ? 'Customize a Program'
      : 'Edit Your Program'
  const pageCopy = builderMode === 'scratch'
    ? 'Choose the load approach first, then set up your split, name each day, and dial in progression without fighting the form.'
    : builderMode === 'template'
      ? 'Start from a built-in plan, inspect the full structure, and tailor it before you save your copy.'
      : 'Update the split, exercises, and progression for this saved program in the same builder flow.'

  if (templateKey && !requestedTemplate) {
    return (
      <div className="page-shell max-w-5xl">
        <section className="page-header">
          <div className="flex flex-col gap-3">
            <span className="eyebrow">Program Editor</span>
            <div className="flex flex-col gap-2">
              <h1 className="page-title">Program unavailable</h1>
              <p className="page-copy">
                The selected template could not be loaded, so there is nothing to edit here.
              </p>
            </div>
          </div>

          <Link href="/programs" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            <ArrowLeft data-icon="inline-start" />
            Back to Programs
          </Link>
        </section>
      </div>
    )
  }

  if (programId && (isProgramLoading || isEditabilityLoading)) {
    return (
      <div className="page-shell max-w-5xl">
        <section className="page-header">
          <div className="flex flex-col gap-3">
            <span className="eyebrow">Program Editor</span>
            <div className="flex flex-col gap-2">
              <h1 className="page-title">Loading program</h1>
              <p className="page-copy">
                Pulling the saved program definition and workout history so the builder can load safely.
              </p>
            </div>
          </div>

          <Link href="/programs" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            <ArrowLeft data-icon="inline-start" />
            Back to Programs
          </Link>
        </section>
      </div>
    )
  }

  if (programId && !program) {
    return (
      <div className="page-shell max-w-5xl">
        <section className="page-header">
          <div className="flex flex-col gap-3">
            <span className="eyebrow">Program Editor</span>
            <div className="flex flex-col gap-2">
              <h1 className="page-title">Program not found</h1>
              <p className="page-copy">
                That program could not be loaded for this account.
              </p>
            </div>
          </div>

          <Link href="/programs" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            <ArrowLeft data-icon="inline-start" />
            Back to Programs
          </Link>
        </section>
      </div>
    )
  }

  return (
    <div className="page-shell max-w-5xl">
      <section className="page-header">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">{eyebrow}</span>
          <div className="flex flex-col gap-2">
            <h1 className="page-title">{pageTitle}</h1>
            <p className="page-copy">{pageCopy}</p>
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
