'use client'

import { useMemo, useState } from 'react'
import { Disc3 } from 'lucide-react'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import type { PreferredUnit } from '@/types/domain'
import {
  calculatePlateBreakdown,
  DEFAULT_BARBELL_WEIGHT_LBS,
  getStandardPlateOptionsLbs,
} from '@/lib/plate-calculator'
import { displayToLbs, formatUnit, formatWeight, lbsToDisplay, snapWeightRoundingLbsToUnit } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface PlateBreakdownInlineProps {
  /** Distinct prescribed weights in lbs for the exercise group */
  weightsLbs: number[]
}

function formatPlateWeight(weightLbs: number, unit: PreferredUnit) {
  return lbsToDisplay(weightLbs, unit, 2)
}

export function PlateBreakdownInline({ weightsLbs }: PlateBreakdownInlineProps) {
  const [open, setOpen] = useState(false)
  const preferredUnit = usePreferredUnit()
  const weightRoundingLbs = usePreferredWeightRounding()
  const plateRoundingLbs = snapWeightRoundingLbsToUnit(weightRoundingLbs, preferredUnit)
  const barbellWeightLbs = preferredUnit === 'kg' ? displayToLbs(20, 'kg') : DEFAULT_BARBELL_WEIGHT_LBS
  const plateOptionsLbs = useMemo(() => getStandardPlateOptionsLbs(preferredUnit), [preferredUnit])

  const breakdowns = useMemo(
    () =>
      weightsLbs.map((w) => ({
        weightLbs: w,
        breakdown: calculatePlateBreakdown(w, {
          barbellWeightLbs,
          plateOptionsLbs,
          roundingLbs: plateRoundingLbs,
        }),
      })),
    [weightsLbs, barbellWeightLbs, plateOptionsLbs, plateRoundingLbs],
  )

  if (weightsLbs.length === 0 || weightsLbs.every((w) => w <= barbellWeightLbs)) return null

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
      >
        <Disc3 className="size-4" />
        {open ? 'Hide plates' : 'Show plates'}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {breakdowns.map(({ weightLbs, breakdown }) => (
            <div key={weightLbs} className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-medium text-foreground">
                {formatWeight(weightLbs, preferredUnit, plateRoundingLbs)}
              </span>
              <span className="text-muted-foreground">→</span>
              {breakdown.platesPerSide.length > 0 ? (
                breakdown.platesPerSide.map((entry) => (
                  <Badge key={entry.weightLbs} variant="outline" className="rounded-full px-2 py-0.5 text-[0.65rem]">
                    {entry.countPerSide}×{formatPlateWeight(entry.weightLbs, preferredUnit)}{formatUnit(preferredUnit)}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">bar only</span>
              )}
              <span className="text-muted-foreground">/side</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
