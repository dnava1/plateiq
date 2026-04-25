'use client'

import { useState } from 'react'
import { useCurrentTrainingMaxes } from '@/hooks/useTrainingMaxes'
import { usePrograms } from '@/hooks/usePrograms'
import { resolveProgramNeedsTrainingMaxForExecution } from '@/lib/programs/method'
import { TrainingMaxPanel } from '@/components/exercises/TrainingMaxPanel'
import { ProgramConfigForm } from '@/components/programs/ProgramConfigForm'
import { ProgramCard } from '@/components/programs/ProgramCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Dumbbell, PlusIcon } from 'lucide-react'

export default function ProgramsPage() {
  const [formOpen, setFormOpen] = useState(false)
  const { data: programs, isLoading } = usePrograms()
  const { data: trainingMaxes = [], isLoading: areTrainingMaxesLoading } = useCurrentTrainingMaxes()
  const count = programs?.length ?? 0

  const activePrograms = programs?.filter((p) => p.is_active) ?? []
  const otherPrograms = programs?.filter((p) => !p.is_active) ?? []
  const hasMultipleSections = activePrograms.length > 0 && otherPrograms.length > 0
  const hasProgramLevelTrainingMaxAccess = (programs ?? []).some((program) => resolveProgramNeedsTrainingMaxForExecution(program))
  const hasResolvedProgramContext = !isLoading && !areTrainingMaxesLoading
  const showsTrainingMaxFallback = hasResolvedProgramContext && trainingMaxes.length > 0 && !hasProgramLevelTrainingMaxAccess

  return (
    <div className="page-shell max-w-5xl">
      <section className="page-header">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Programming</span>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="page-title">Programs</h1>
              <Badge variant="outline" className="rounded-full px-2.5">
                {count} total
              </Badge>
            </div>
            <p className="page-copy">
              Plan the next block, review saved programs, or open the builder and choose the loading model only where it actually belongs.
            </p>
          </div>
        </div>

        <Button onClick={() => setFormOpen(true)} size="lg">
          <PlusIcon data-icon="inline-start" />
          New Program
        </Button>
      </section>

      {isLoading && (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="surface-panel p-5">
              <div className="flex flex-col gap-3">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-28" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (!programs || programs.length === 0) && (
        <div className="surface-panel p-5">
          <Empty className="border-border/70 bg-background/40 py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Dumbbell />
              </EmptyMedia>
              <EmptyTitle>No programs yet</EmptyTitle>
              <EmptyDescription>
                Create your first program so PlateIQ has a clear planning surface before you move into workouts and review.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setFormOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                New Program
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      )}

      {programs && programs.length > 0 && (
        <div className="flex flex-col gap-8">
          {activePrograms.length > 0 && (
            <div className="flex flex-col gap-4">
              {hasMultipleSections && <span className="eyebrow">Active</span>}
              <div className="grid gap-4">
                {activePrograms.map((program) => (
                  <ProgramCard key={program.id} program={program} />
                ))}
              </div>
            </div>
          )}

          {otherPrograms.length > 0 && (
            <div className="flex flex-col gap-4">
              {hasMultipleSections && <span className="eyebrow">Other Programs</span>}
              <div className="grid gap-4 xl:grid-cols-2">
                {otherPrograms.map((program) => (
                  <ProgramCard key={program.id} program={program} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showsTrainingMaxFallback && (
        <div className="pt-2">
          <TrainingMaxPanel
            title="Saved Training Maxes"
            description="No current program depends on these values right now, but you can still review or adjust them here until you reopen a TM-based block."
          />
        </div>
      )}

      <ProgramConfigForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
