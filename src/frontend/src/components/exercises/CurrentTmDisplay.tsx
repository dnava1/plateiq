import { formatWeight } from '@/lib/utils'
import type { PreferredUnit } from '@/types/domain'

interface CurrentTmDisplayProps {
  exerciseName: string
  weightLbs: number | undefined
  unit: PreferredUnit
  effectiveDate?: string
}

export function CurrentTmDisplay({ exerciseName, weightLbs, unit, effectiveDate }: CurrentTmDisplayProps) {
  if (!weightLbs) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">{exerciseName}</span>
        <span className="text-sm text-muted-foreground">Not set</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{exerciseName}</span>
      <div className="flex flex-col gap-1">
        <span className="font-mono text-2xl font-semibold tracking-[-0.06em] text-foreground">
          {formatWeight(weightLbs, unit)}
        </span>
        {effectiveDate && (
          <p className="text-xs text-muted-foreground">
            Set: {new Date(effectiveDate + 'T00:00:00').toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  )
}
