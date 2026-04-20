'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Activity, PlusIcon } from 'lucide-react'
import { useActiveProgram } from '@/hooks/usePrograms'
import { useWorkoutSessionStore } from '@/store/workoutSessionStore'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { ActiveWorkoutPanel } from '@/components/workouts/ActiveWorkoutPanel'
import { WorkoutLauncher } from '@/components/workouts/WorkoutLauncher'

export default function WorkoutsPage() {
  const { data: activeProgram, isLoading } = useActiveProgram()
  const activeWorkoutId = useWorkoutSessionStore((state) => state.activeWorkoutId)
  const clearSession = useWorkoutSessionStore((state) => state.clearSession)

  useEffect(() => {
    if (!activeProgram && activeWorkoutId) {
      clearSession()
    }
  }, [activeProgram, activeWorkoutId, clearSession])

  return (
    <div className="page-shell max-w-6xl">
      <section className="page-header">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Gym Mode</span>
          <div className="flex flex-col gap-2">
            <h1 className="page-title">Workouts</h1>
            <p className="page-copy">
              Run today&apos;s session, keep the next action obvious, and stay focused on execution from launch through completion.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6">
        {isLoading ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] xl:items-start">
            <div className="metric-tile flex flex-col gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Card className="surface-panel">
              <CardContent className="flex flex-col gap-4 pt-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-52 w-full rounded-[24px]" />
              </CardContent>
            </Card>
          </section>
        ) : !activeProgram ? (
          <Card className="surface-panel">
            <CardContent className="pt-4">
              <Empty className="border-border/70 bg-background/40 py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Activity />
                  </EmptyMedia>
                  <EmptyTitle>No active program</EmptyTitle>
                  <EmptyDescription>
                    Pick a program first so PlateIQ can generate the session plan and keep the workout flow offline-ready.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Link href="/programs" className={buttonVariants({ variant: 'default' })}>
                    <PlusIcon data-icon="inline-start" />
                    Start a Program
                  </Link>
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        ) : activeWorkoutId ? (
          <ActiveWorkoutPanel program={activeProgram} />
        ) : (
          <WorkoutLauncher program={activeProgram} />
        )}

      </div>
    </div>
  )
}