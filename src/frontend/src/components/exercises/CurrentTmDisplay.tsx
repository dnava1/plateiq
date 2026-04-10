interface CurrentTmDisplayProps {
  exerciseName: string
  weightLbs: number | undefined
  effectiveDate?: string
}

export function CurrentTmDisplay({ exerciseName, weightLbs, effectiveDate }: CurrentTmDisplayProps) {
  if (!weightLbs) {
    return (
      <div className="text-sm text-muted-foreground">
        {exerciseName}: Not set
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <span className="font-medium">{exerciseName}</span>
      <div className="text-right">
        <span className="font-mono font-bold">{weightLbs} lbs</span>
        {effectiveDate && (
          <p className="text-xs text-muted-foreground">
            Set: {new Date(effectiveDate + 'T00:00:00').toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  )
}
