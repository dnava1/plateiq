export interface DashboardProgramSummary {
  id: number
  name: string
  templateKey: string
}

export interface DashboardCycleSummary {
  id: number
  cycleNumber: number
}

export interface DashboardRecentWorkout {
  id: number
  exerciseName: string
  weekNumber: number
  completedAt: string | null
  scheduledDate: string
}

export interface DashboardTrainingMax {
  exerciseId: number
  exerciseName: string
  weightLbs: number
  effectiveDate: string
}

export interface DashboardData {
  activeProgram: DashboardProgramSummary | null
  currentCycle: DashboardCycleSummary | null
  recentWorkouts: DashboardRecentWorkout[]
  currentTms: DashboardTrainingMax[]
}

export interface AnalyticsE1rmPoint {
  date: string
  exerciseId: number
  exerciseName: string
  weight: number
  reps: number
  e1rm: number
}

export interface AnalyticsVolumePoint {
  weekStart: string
  exerciseId: number
  exerciseName: string
  totalVolume: number
  totalSets: number
}

export interface AnalyticsPrPoint {
  date: string
  exerciseId: number
  exerciseName: string
  weight: number
  reps: number
  e1rm: number
}

export interface AnalyticsConsistency {
  totalSessions: number
  weeksActive: number
  firstSession: string | null
  lastSession: string | null
}

export interface AnalyticsMuscleBalancePoint {
  movementPattern: string
  totalVolume: number
  volumePct: number
}

export interface AnalyticsStallPoint {
  exerciseId: number
  exerciseName: string
  lastPrDate: string
  weeksSincePr: number
}

export interface AnalyticsTmProgressionPoint {
  effectiveDate: string
  exerciseId: number
  exerciseName: string
  weightLbs: number
}

export interface AnalyticsData {
  e1rmTrend: AnalyticsE1rmPoint[]
  volumeTrend: AnalyticsVolumePoint[]
  prHistory: AnalyticsPrPoint[]
  consistency: AnalyticsConsistency
  muscleBalance: AnalyticsMuscleBalancePoint[]
  stallDetection: AnalyticsStallPoint[]
  tmProgression: AnalyticsTmProgressionPoint[]
}

export interface DerivedRecentPr extends AnalyticsPrPoint {
  improvementLbs: number | null
}

export interface WeeklyVolumeSummary {
  weekStart: string
  totalVolume: number
  totalSets: number
}

export interface WeeklyActivitySummary extends WeeklyVolumeSummary {
  isActive: boolean
}
