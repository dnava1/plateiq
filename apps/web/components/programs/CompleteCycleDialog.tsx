'use client'

import { useEffect, useMemo, useState } from 'react'
import { CloudOff, Flag } from 'lucide-react'
import { toast } from 'sonner'
import {
  buildCycleProgressionPayload,
  useCompleteCycle,
  useCycleCompletionPreview,
  type CycleProgressionPreviewRow,
} from '@/hooks/useCycleCompletion'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import type { TrainingProgram } from '@/hooks/usePrograms'
import { resolveWorkoutProgram } from '@/hooks/useWorkouts'
import { resolveRequiredInputCopy } from '@/lib/programs/inputRequirements'
import type { PreferredUnit } from '@/types/domain'
import { displayToLbs, formatUnit, formatWeight, lbsToDisplay } from '@/lib/utils'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CompleteCycleDialogProps {
  program: TrainingProgram
}

interface EditableCycleProgressionRow extends CycleProgressionPreviewRow {
  isOverride: boolean
  isValid: boolean
  nextTmInput: string
  suggestedIncrementLbs: number
  suggestedNewTmLbs: number
}

const PREVIEW_OVERRIDE_EPSILON_LBS = 0.05

function getIncrementBadge(rowIncrementLbs: number, preferredUnit: PreferredUnit) {
  if (rowIncrementLbs === 0) {
    return { label: 'Hold', variant: 'outline' as const }
  }

  const formattedIncrement = formatWeight(Math.abs(rowIncrementLbs), preferredUnit)
  return {
    label: rowIncrementLbs > 0 ? `+${formattedIncrement}` : `-${formattedIncrement}`,
    variant: rowIncrementLbs > 0 ? ('secondary' as const) : ('destructive' as const),
  }
}

function formatEditableNextTmValue(weightLbs: number, preferredUnit: PreferredUnit) {
  return String(lbsToDisplay(weightLbs, preferredUnit, 1))
}

export function CompleteCycleDialog({ program }: CompleteCycleDialogProps) {
  const preferredUnit = usePreferredUnit()
  const weightRoundingLbs = usePreferredWeightRounding()
  const clearSession = useWorkoutSessionStore((state) => state.clearSession)
  const completeCycle = useCompleteCycle()
  const { activeCycle, inputMode, missingInputNames, previewRows, isLoading } = useCycleCompletionPreview(program)
  const { template } = useMemo(
    () => resolveWorkoutProgram(program, weightRoundingLbs, activeCycle),
    [activeCycle, program, weightRoundingLbs],
  )
  const usesTrainingMax = template?.uses_training_max ?? false
  const requiredInputCopy = resolveRequiredInputCopy(inputMode === 'none' ? 'tm' : inputMode)
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [open, setOpen] = useState(false)
  const [nextTmInputs, setNextTmInputs] = useState<Record<number, string>>({})

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

  useEffect(() => {
    if (!open) {
      setNextTmInputs({})
      return
    }

    setNextTmInputs(
      Object.fromEntries(
        previewRows.map((row) => [row.exerciseId, formatEditableNextTmValue(row.newTmLbs, preferredUnit)]),
      ),
    )
  }, [open, preferredUnit, previewRows])

  const adjustedPreviewRows = useMemo<EditableCycleProgressionRow[]>(() => {
    return previewRows.map((row) => {
      const nextTmInput = nextTmInputs[row.exerciseId] ?? formatEditableNextTmValue(row.newTmLbs, preferredUnit)
      const parsedNextTm = Number(nextTmInput)
      const isValid = nextTmInput.trim().length > 0 && Number.isFinite(parsedNextTm) && parsedNextTm >= 0
      const nextTmLbs = isValid ? Math.max(0, displayToLbs(parsedNextTm, preferredUnit)) : row.newTmLbs
      const incrementLbs = isValid ? nextTmLbs - row.currentTmLbs : row.incrementLbs

      return {
        ...row,
        incrementLbs,
        isOverride: isValid && Math.abs(nextTmLbs - row.newTmLbs) > PREVIEW_OVERRIDE_EPSILON_LBS,
        isValid,
        newTmLbs: nextTmLbs,
        nextTmInput,
        suggestedIncrementLbs: row.incrementLbs,
        suggestedNewTmLbs: row.newTmLbs,
      }
    })
  }, [nextTmInputs, preferredUnit, previewRows])

  const hasInvalidNextTmInput = adjustedPreviewRows.some((row) => !row.isValid)

  const handleConfirm = () => {
    if (!activeCycle) {
      toast.error('No active cycle was found for this program.')
      return
    }

    if (!isOnline) {
      toast.error('Go online to complete the cycle and create the next one.')
      return
    }

    if (hasInvalidNextTmInput) {
      toast.error('Enter a valid next training max for each lift before completing the cycle.')
      return
    }

    completeCycle.mutate(
      {
        cycleId: activeCycle.id,
        progression: buildCycleProgressionPayload(adjustedPreviewRows),
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
      <Button type="button" size="sm" onClick={() => setOpen(true)} className="h-auto min-h-7 whitespace-normal text-center">
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
                ? 'Review the suggested next-cycle training maxes, then keep them or overwrite them before you roll into the next block.'
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
              {usesTrainingMax && missingInputNames.length > 0
                ? `${requiredInputCopy.missingActionMessage} ${missingInputNames.join(', ')} before this checkpoint can suggest next-cycle changes.`
                : usesTrainingMax
                  ? 'No training max changes are queued for the next cycle. Completing the cycle will still close the current block and create the next one.'
                : 'No training max changes are queued here. Completing the cycle will still close the current block and create the next one while broader review stays outside this checkpoint for now.'}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {adjustedPreviewRows.map((row) => {
                const appliedIncrementBadge = getIncrementBadge(row.incrementLbs, preferredUnit)
                const suggestedIncrementBadge = getIncrementBadge(row.suggestedIncrementLbs, preferredUnit)

                return (
                  <div key={row.exerciseId} className="rounded-[22px] border border-border/70 bg-background/55 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{row.exerciseName}</p>
                          {row.isOverride ? <Badge variant="outline">Manual override</Badge> : null}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{row.reason}</p>
                      </div>
                      <Badge variant={appliedIncrementBadge.variant}>{appliedIncrementBadge.label}</Badge>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                      <div className="rounded-2xl border border-border/60 bg-card/70 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Current TM</p>
                        <p className="font-medium text-foreground">{formatWeight(row.currentTmLbs, preferredUnit, weightRoundingLbs)}</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-card/70 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Suggested</p>
                        <p className="font-medium text-foreground">{suggestedIncrementBadge.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Next {formatWeight(row.suggestedNewTmLbs, preferredUnit, weightRoundingLbs)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-card/70 px-3 py-2">
                        <Label htmlFor={`next-cycle-tm-${row.exerciseId}`} className="text-xs text-muted-foreground">
                          Next cycle TM ({formatUnit(preferredUnit)})
                        </Label>
                        <Input
                          id={`next-cycle-tm-${row.exerciseId}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={preferredUnit === 'kg' ? '0.5' : '2.5'}
                          value={row.nextTmInput}
                          onChange={(event) => {
                            const nextValue = event.target.value
                            setNextTmInputs((current) => ({
                              ...current,
                              [row.exerciseId]: nextValue,
                            }))
                          }}
                          className="mt-2"
                        />
                        {row.isValid ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Applies {appliedIncrementBadge.label} and lands on {formatWeight(row.newTmLbs, preferredUnit, weightRoundingLbs)}.
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-destructive">Enter a valid next training max.</p>
                        )}
                        {row.isOverride ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setNextTmInputs((current) => ({
                                ...current,
                                [row.exerciseId]: formatEditableNextTmValue(row.suggestedNewTmLbs, preferredUnit),
                              }))
                            }}
                            className="mt-2 h-auto px-0 text-xs"
                          >
                            Reset to suggestion
                          </Button>
                        ) : null}
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
              disabled={!activeCycle || !isOnline || isLoading || completeCycle.isPending || hasInvalidNextTmInput}
            >
              {completeCycle.isPending ? 'Completing…' : 'Complete Cycle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
