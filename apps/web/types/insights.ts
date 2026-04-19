export interface GenerateInsightInput {
  dateFrom: string
  dateTo: string
  exerciseId: number | null
}

export interface TrainingInsight {
  summary: string
  strengths: string[]
  concerns: string[]
  recommendations: string[]
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
      latestAddedLoadLbs: number | null
      latestStrictRepBest: number | null
      strictSessionCount: number
      weightedSessionCount: number
    }>
    recentStrictRepTrend: Array<{
      bestReps: number
      date: string
      exerciseName: string
    }>
    recentWeightedLoadTrend: Array<{
      addedWeightLbs: number
      date: string
      exerciseName: string
      reps: number
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
}