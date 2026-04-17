'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import {
  formatStrengthProfileMissingField,
  getStrengthRepMaxWeight,
  STRENGTH_REP_RANGE,
  SUPPORTED_STRENGTH_LIFT_NAMES,
} from '@/lib/strength-profile'
import { getBenchmarkStrengthColorClass } from '@/lib/strength-benchmarks'
import { formatWeight } from '@/lib/utils'
import type { StrengthProfileData, StrengthProfileLift } from '@/types/analytics'

interface StrengthProfilePanelProps {
  strengthProfile: StrengthProfileData
}

function formatDeviation(deviationFromTotalPct: number) {
  const sign = deviationFromTotalPct > 0 ? '+' : ''
  return `${sign}${deviationFromTotalPct.toFixed(1)}%`
}

function describeBestSet(
  lift: StrengthProfileLift,
  unit: ReturnType<typeof usePreferredUnit>,
  roundingLbs: ReturnType<typeof usePreferredWeightRounding>,
) {
  const bestExternal = formatWeight(lift.bestExternalWeightLbs, unit, roundingLbs)
  const bestTotal = formatWeight(lift.bestTotalLoadLbs, unit, roundingLbs)

  if (Math.abs(lift.bestExternalWeightLbs - lift.bestTotalLoadLbs) > 0.1) {
    return `${bestExternal} external / ${bestTotal} total x ${lift.bestReps}`
  }

  return `${bestExternal} x ${lift.bestReps}`
}

function formatRepStandardLabel(repCount: number) {
  return repCount === 1 ? '1RM' : `${repCount}RM`
}

export function StrengthProfilePanel({ strengthProfile }: StrengthProfilePanelProps) {
  const preferredUnit = usePreferredUnit()
  const weightRoundingLbs = usePreferredWeightRounding()
  const [selectedRep, setSelectedRep] = useState('1')
  const selectedRepCount = Number(selectedRep)
  const selectedRepLabel = formatRepStandardLabel(selectedRepCount)
  const isMissingProfile = strengthProfile.status === 'missing_profile'
  const isPartialProfile = strengthProfile.status === 'insufficient_data'
  const summaryStatusCopy = isPartialProfile
    ? 'Complete the minimum lift coverage to unlock your final profile totals.'
    : (strengthProfile.totalLabel ?? 'Need more scored lifts')
  const symmetryStatusCopy = isPartialProfile
    ? 'Available once your profile covers enough scored categories.'
    : '100 minus variance across your lift scores'

  return (
    <Card className="surface-panel xl:col-span-2">
      <CardHeader className="gap-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2">
            <CardTitle className="text-lg">Strength Profile</CardTitle>
            <CardDescription>
              See how your logged lifts score against benchmark standards adjusted for sex, bodyweight, and age. Exercise filters do not narrow this profile.
            </CardDescription>
          </div>

          {!isMissingProfile && strengthProfile.lifts.length > 0 && (
            <div className="flex w-full flex-col gap-2 sm:max-w-36">
              <label htmlFor="strength-profile-rep" className="text-sm font-medium text-foreground">View Rep Max</label>
              <Select value={selectedRep} onValueChange={(value) => value && setSelectedRep(value)}>
                <SelectTrigger id="strength-profile-rep" className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {STRENGTH_REP_RANGE.map((repCount) => (
                      <SelectItem key={repCount} value={String(repCount)}>{repCount}RM</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5 pt-0">
        {isMissingProfile && (
          <div className="rounded-[24px] border border-primary/20 bg-primary/6 p-5">
            <p className="text-sm text-foreground">
              Add athlete sex, age, and bodyweight in settings to unlock strength scoring, lift analysis, and muscle-group scoring.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {strengthProfile.missingFields.map((field) => (
                <Badge key={field} variant="outline" className="rounded-full px-3 py-1 text-xs">
                  Missing {formatStrengthProfileMissingField(field)}
                </Badge>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Supported lifts include {SUPPORTED_STRENGTH_LIFT_NAMES.slice(0, 6).join(', ')}, and more.
              </p>
              <Link href="/settings" className={buttonVariants({ size: 'sm' })}>
                Complete Strength Profile
              </Link>
            </div>
          </div>
        )}

        {!isMissingProfile && isPartialProfile && (
          <div className="rounded-[24px] border border-border/70 bg-background/45 p-4 text-sm text-muted-foreground">
            PlateIQ detected {strengthProfile.availableLiftCount} scored lifts across {strengthProfile.availableCategoryCount} categories.
            Log at least {strengthProfile.minimumLiftCount} supported lifts across {strengthProfile.minimumCategoryCount} categories for a full profile. Summary metrics stay provisional until then.
          </div>
        )}

        {!isMissingProfile && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-border/70 bg-background/45 p-4">
              <span className="eyebrow">Total Score</span>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-foreground">
                {strengthProfile.totalScore !== null ? strengthProfile.totalScore.toFixed(1) : '—'}
              </p>
              {strengthProfile.totalLabel && !isPartialProfile ? (
                <span className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getBenchmarkStrengthColorClass(strengthProfile.totalLabel)}`}>{strengthProfile.totalLabel}</span>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">{summaryStatusCopy}</p>
              )}
            </div>

            <div className="rounded-[22px] border border-border/70 bg-background/45 p-4">
              <span className="eyebrow">Symmetry</span>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-foreground">
                {strengthProfile.symmetryScore !== null ? strengthProfile.symmetryScore.toFixed(1) : '—'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{symmetryStatusCopy}</p>
            </div>

            <div className="rounded-[22px] border border-border/70 bg-background/45 p-4">
              <span className="eyebrow">Strongest Lift</span>
              <p className="mt-2 text-lg font-semibold tracking-[-0.05em] text-foreground">
                {strengthProfile.strongestLift?.displayName ?? '—'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {strengthProfile.strongestLift
                  ? `${formatDeviation(strengthProfile.strongestLift.deviationFromTotalPct)} vs profile expectation`
                  : 'Waiting for a complete profile snapshot'}
              </p>
            </div>

            <div className="rounded-[22px] border border-border/70 bg-background/45 p-4">
              <span className="eyebrow">Weakest Lift</span>
              <p className="mt-2 text-lg font-semibold tracking-[-0.05em] text-foreground">
                {strengthProfile.weakestLift?.displayName ?? '—'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {strengthProfile.weakestLift
                  ? `${formatDeviation(strengthProfile.weakestLift.deviationFromTotalPct)} vs profile expectation`
                  : 'Waiting for a complete profile snapshot'}
              </p>
            </div>
          </div>
        )}

        {!isMissingProfile && strengthProfile.categories.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-foreground">Category Scores</h3>
              <p className="text-xs text-muted-foreground">Best lift score per benchmark category</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {strengthProfile.categories.map((category) => (
                <span key={category.categoryKey} className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getBenchmarkStrengthColorClass(category.strengthLabel)}`}>
                  {category.categoryLabel} {category.score.toFixed(1)} · {category.strengthLabel}
                </span>
              ))}
            </div>
          </div>
        )}

        {!isMissingProfile && strengthProfile.lifts.length > 0 && (
          <div className="grid gap-3 xl:grid-cols-2">
            {strengthProfile.lifts.map((lift) => {
              const actualRepMaxLbs = getStrengthRepMaxWeight(lift.actualRepMaxes, selectedRepCount)

              return (
                <div key={lift.liftSlug} className="rounded-[24px] border border-border/70 bg-background/45 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-base font-semibold tracking-[-0.04em] text-foreground">{lift.displayName}</p>
                      <p className="text-sm text-muted-foreground">{lift.categoryLabel} · best from {lift.sourceExerciseName}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getBenchmarkStrengthColorClass(lift.strengthLabel)}`}>{lift.strengthLabel}</span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Score</p>
                      <p className="mt-1 text-lg font-semibold tracking-[-0.05em] text-foreground">{lift.score.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Your Estimated {selectedRepLabel}</p>
                      <p className="mt-1 text-lg font-semibold tracking-[-0.05em] text-foreground">
                        {actualRepMaxLbs !== null ? formatWeight(actualRepMaxLbs, preferredUnit, weightRoundingLbs) : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-1 text-sm text-muted-foreground">
                    <p>Best logged set: {describeBestSet(lift, preferredUnit, weightRoundingLbs)}</p>
                    <p>1RM estimate from that set: {formatWeight(lift.bestOneRepMaxLbs, preferredUnit, weightRoundingLbs)}</p>
                    {lift.deviationFromTotalPct !== null && (
                      <p>{formatDeviation(lift.deviationFromTotalPct)} vs the lift expected at your total score</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!isMissingProfile && strengthProfile.lifts.length === 0 && (
          <div className="rounded-[24px] border border-border/70 bg-background/45 p-4 text-sm text-muted-foreground">
            Log supported lifts such as {SUPPORTED_STRENGTH_LIFT_NAMES.slice(0, 4).join(', ')} to light up the strength profile.
          </div>
        )}

        {!isMissingProfile && strengthProfile.muscleGroups.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-foreground">Muscle-Group Profile</h3>
              <p className="text-xs text-muted-foreground">Weighted from the benchmark lift involvement map</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {strengthProfile.muscleGroups.map((muscleGroup) => (
                <div key={muscleGroup.muscleKey} className="rounded-[20px] border border-border/70 bg-background/45 p-4">
                  <p className="text-sm font-medium text-foreground">{muscleGroup.title}</p>
                  <p className="mt-2 text-xl font-semibold tracking-[-0.05em] text-foreground">{muscleGroup.score.toFixed(1)}</p>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getBenchmarkStrengthColorClass(muscleGroup.strengthLabel)}`}>{muscleGroup.strengthLabel}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}