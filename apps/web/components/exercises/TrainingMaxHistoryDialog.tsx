'use client'

import { useMemo } from 'react'
import { useTrainingMaxHistory } from '@/hooks/useTrainingMaxes'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { formatDate, formatWeight } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

interface TrainingMaxHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exerciseId: number
  exerciseName: string
}

export function TrainingMaxHistoryDialog({
  open,
  onOpenChange,
  exerciseId,
  exerciseName,
}: TrainingMaxHistoryDialogProps) {
  const preferredUnit = usePreferredUnit()
  const { data: history = [], isLoading } = useTrainingMaxHistory(exerciseId)
  const recentHistory = useMemo(() => [...history].reverse(), [history])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Training Max History — {exerciseName}</DialogTitle>
          <DialogDescription>
            Review saved changes here without leaving the planning and workout surfaces.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-3 overflow-y-auto pr-1" style={{ maxHeight: '24rem' }}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-[22px] border border-border/70 bg-background/55 p-4">
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-32" />
                </div>
              </div>
            ))
          ) : recentHistory.length === 0 ? (
            <div className="rounded-[22px] border border-border/70 bg-background/55 px-4 py-6 text-sm text-muted-foreground">
              No saved training max history exists for this lift yet.
            </div>
          ) : (
            recentHistory.map((entry) => (
              <div key={entry.id} className="rounded-[22px] border border-border/70 bg-background/55 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="text-sm font-medium text-foreground">{formatDate(entry.effective_date)}</p>
                    <p className="font-mono text-2xl font-semibold tracking-[-0.06em] text-foreground">
                      {formatWeight(entry.weight_lbs, preferredUnit)}
                    </p>
                  </div>
                  <Badge variant="outline">TM {Math.round(entry.tm_percentage * 100)}%</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}