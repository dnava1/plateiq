export interface GenerateInsightInput {
  dateFrom: string
  dateTo: string
  exerciseId: number | null
}

export type ProgressionGuidanceAction = 'increase' | 'hold' | 'repeat' | 'review'
export type ProgressionGuidanceMethodContext = 'loaded_strength' | 'training_max'
export type ProgressionGuidanceBoundedReason =
  | 'broader_scope'
  | 'unsupported_scope'
  | 'insufficient_coverage'
  | 'mixed_signal'
  | 'model_mismatch'

export interface ActionableProgressionGuidance {
  disposition: 'actionable'
  action: ProgressionGuidanceAction
  exerciseName: string
  methodContext: ProgressionGuidanceMethodContext
  rationale: string
}

export interface BoundedProgressionGuidance {
  disposition: 'bounded'
  note: string
  reason: ProgressionGuidanceBoundedReason
}

export type ProgressionGuidance = ActionableProgressionGuidance | BoundedProgressionGuidance

export interface TrainingInsight {
  summary: string
  strengths: string[]
  concerns: string[]
  recommendations: string[]
  progressionGuidance: ProgressionGuidance
}

export interface InsightProgressionGuidanceContext {
  allowedActions: ProgressionGuidanceAction[]
  boundedReason: ProgressionGuidanceBoundedReason | null
  disposition: 'actionable' | 'bounded'
  exerciseName: string | null
  fallbackNote: string
  methodContext: ProgressionGuidanceMethodContext | null
  signalSummary: string
}

export interface InsightSnapshot {
  filter: {
    dateFrom: string
    dateTo: string
    windowDays: number
    exerciseScope: string
  }
  coverage: Array<{
    family: string
    signalCount: number
    status: string
  }>
  consistency: {
    totalSessions: number
    weeksActive: number
    averageSessionsPerWeek: number
    firstSession: string | null
    lastSession: string | null
  }
  bodyweight: {
    exercises: Array<{
      exerciseName: string
      latestStrictRepBest: number | null
      strictSessionCount: number
      totalLoggedReps: number
    }>
    recentRepTrend: Array<{
      bestReps: number
      date: string
      exerciseName: string
    }>
    recentWeeklyVolumeTrend: Array<{
      totalReps: number
      totalSessions: number
      weekStart: string
    }>
    relevant: boolean
  }
  strength: {
    recentPrs: Array<{
      exerciseName: string
      date: string
      e1rm: number
      weight: number
      reps: number
      improvementLbs: number | null
    }>
    e1rmHighlights: Array<{
      exerciseName: string
      latestE1rm: number
      changeLbs: number
      lastDate: string
      sourceWeight: number
      sourceReps: number
    }>
    stalledLifts: Array<{
      exerciseName: string
      lastPrDate: string
      weeksSincePr: number
    }>
  }
  volume: {
    currentWeekVolume: number
    trailingAverageVolume: number
    peakWeekVolume: number
    totalVolume: number
    activeWeeksWithVolume: number
  }
  balance: Array<{
    movementPattern: string
    volumePct: number
    totalVolume: number
  }>
  dataGaps: string[]
  progressionGuidanceContext: InsightProgressionGuidanceContext
}
