'use client'

import { useEffect, useMemo, useState } from 'react'
import { CloudOff, Flag } from 'lucide-react'
import { toast } from 'sonner'
import { useCycleCompletionPreview, useCompleteCycle, buildCycleProgressionPayload } from '@/hooks/useCycleCompletion'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { resolveWorkoutProgram } from '@/hooks/useWorkouts'
import type { TrainingProgram } from '@/hooks/usePrograms'
import { formatWeight } from '@/lib/utils'
import { useWorkoutSessionStore } from '@/store/workoutSessionStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CompleteCycleDialogProps {
  program: TrainingProgram
}

function getIncrementBadge(rowIncrementLbs: number, preferredUnit: ReturnType<typeof usePreferredUnit>) {
  if (rowIncrementLbs === 0) {
    return { label: 'Hold', variant: 'outline' as const }
  }

  const formattedIncrement = formatWeight(rowIncrementLbs, preferredUnit)
  return {
    label: rowIncrementLbs > 0 ? `+${formattedIncrement}` : formattedIncrement,
    variant: rowIncrementLbs > 0 ? ('secondary' as const) : ('destructive' as const),
  }
}

export function CompleteCycleDialog({ program }: CompleteCycleDialogProps) {
  const preferredUnit = usePreferredUnit()
  const weightRoundingLbs = usePreferredWeightRounding()
  const clearSession = useWorkoutSessionStore((state) => state.clearSession)
  const completeCycle = useCompleteCycle()
  const { activeCycle, previewRows, isLoading } = useCycleCompletionPreview(program)
  const { template } = useMemo(
    () => resolveWorkoutProgram(program, weightRoundingLbs, activeCycle),
    [activeCycle, program, weightRoundingLbs],
  )
  const usesTrainingMax = template?.uses_training_max ?? false
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleConfirm = () => {
    if (!activeCycle) {
      toast.error('No active cycle was found for this program.')
      return
    }

    if (!isOnline) {
      toast.error('Go online to complete the cycle and create the next one.')
      return
    }

    completeCycle.mutate(
      {
        cycleId: activeCycle.id,
        progression: buildCycleProgressionPayload(previewRows),
      },
      {
        onSuccess: (result) => {
          clearSession()
          setOpen(false)
          toast.success(`Cycle ${activeCycle.cycle_number} complete. Cycle ${result.new_cycle_number} is ready.`)
        },
        onError: (error) => {
          toast.error(error.message)
        },
      },
    )
  }

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Flag data-icon="inline-start" />
        Cycle Checkpoint
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="gap-2 pr-8">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle>Cycle Checkpoint</DialogTitle>
              {activeCycle ? <Badge variant="outline">Cycle {activeCycle.cycle_number}</Badge> : null}
            </div>
            <DialogDescription>
              {usesTrainingMax
                ? 'Review the next-cycle training max preview, then confirm the rollover when you are ready to start the next block.'
                : 'This is the current TM-first checkpoint for rolling the block forward. Broader cycle review can expand here later, but this is still where you confirm the next block today.'}
            </DialogDescription>
          </DialogHeader>

          {!isOnline ? (
            <div className="flex items-center gap-3 rounded-[22px] border border-border/70 bg-background/55 px-4 py-3 text-sm text-muted-foreground">
              <CloudOff />
              Cycle completion is online-only because it creates the next cycle and writes the progression update in one RPC.
            </div>
          ) : null}

          {!usesTrainingMax ? (
            <div className="rounded-[22px] border border-border/70 bg-background/55 px-4 py-3 text-sm text-muted-foreground">
              Training max is not the organizing model for this program. Treat this as the current checkpoint for rolling the block forward while broader cycle review grows around it later.
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-[22px] border border-border/70 bg-background/55 px-4 py-6 text-sm text-muted-foreground">
              Building the cycle progression preview...
            </div>
          ) : !activeCycle ? (
            <div className="rounded-[22px] border border-border/70 bg-background/55 px-4 py-6 text-sm text-muted-foreground">
              No active cycle was found for this program.
            </div>
          ) : previewRows.length === 0 ? (
            <div className="rounded-[22px] border border-border/70 bg-background/55 px-4 py-6 text-sm text-muted-foreground">
              {usesTrainingMax
                ? 'No training max changes are queued for the next cycle. Completing the cycle will still close the current block and create the next one.'
                : 'No training max changes are queued here. Completing the cycle will still close the current block and create the next one while broader review stays outside this checkpoint for now.'}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {previewRows.map((row) => {
                const incrementBadge = getIncrementBadge(row.incrementLbs, preferredUnit)

                return (
                  <div key={row.exerciseId} className="rounded-[22px] border border-border/70 bg-background/55 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{row.exerciseName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{row.reason}</p>
                      </div>
                      <Badge variant={incrementBadge.variant}>{incrementBadge.label}</Badge>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                      <div className="rounded-2xl border border-border/60 bg-card/70 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Current TM</p>
                        <p className="font-medium text-foreground">{formatWeight(row.currentTmLbs, preferredUnit, weightRoundingLbs)}</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-card/70 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Adjustment</p>
                        <p className="font-medium text-foreground">{incrementBadge.label}</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-card/70 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Next TM</p>
                        <p className="font-medium text-foreground">{formatWeight(row.newTmLbs, preferredUnit, weightRoundingLbs)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <DialogFooter className="sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!activeCycle || !isOnline || isLoading || completeCycle.isPending}
            >
              {completeCycle.isPending ? 'Completing…' : 'Complete Cycle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
