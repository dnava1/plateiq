import type { IntensityType, ProgressionStyle, ProgramLevel } from './domain'

export interface SetPrescription {
  sets: number
  reps: number | string // 5 or "5+" (AMRAP) or "3-5" (range)
  reps_max?: number
  intensity: number // 0.85 = 85% TM, 8.0 = RPE 8, 135 = fixed lbs
  intensity_type: IntensityType
  is_amrap?: boolean
  rest_seconds?: number
}

export interface ExerciseBlock {
  block_id?: string
  role: 'primary' | 'variation' | 'accessory'
  exercise_id?: number
  exercise_key?: string // 'squat' | 'bench' | null (user picks)
  sets: SetPrescription[]
  notes?: string
}

export interface DayTemplate {
  label: string // "Squat Day", "Heavy Bench", "Upper A"
  exercise_blocks: ExerciseBlock[]
}

export interface VariationOption {
  key: string
  name: string
  description: string
  blocks: ExerciseBlock[]
}

export interface ProgressionRule {
  style: ProgressionStyle
  increment_lbs?: { upper: number; lower: number }
  deload_trigger?: string
  deload_strategy?: string
}

export interface ProgramTemplate {
  key: string
  name: string
  level: ProgramLevel
  description: string
  days_per_week: number
  cycle_length_weeks: number
  uses_training_max: boolean
  default_tm_percentage?: number
  required_exercises: string[] // exercise keys needed for this program
  days: DayTemplate[]
  week_schemes?: Record<number, { label: string; intensity_modifier?: number }> // for wave loading (5/3/1 weeks)
  variation_options?: VariationOption[]
  progression: ProgressionRule
  source_url?: string
}

export interface GeneratedSet {
  exercise_key: string
  exercise_id?: number
  set_order: number
  set_type: 'warmup' | 'main' | 'amrap' | 'variation' | 'accessory'
  weight_lbs: number
  reps_prescribed: number
  reps_prescribed_max?: number
  is_amrap: boolean
  intensity_type: IntensityType
  rpe?: number
  notes?: string
}

export interface CustomProgramConfig {
  type: 'custom'
  level?: ProgramLevel
  days_per_week: number
  cycle_length_weeks: number
  uses_training_max: boolean
  tm_percentage?: number
  rounding?: number
  days: DayTemplate[]
  progression: ProgressionRule
}

export function isCustomProgramConfig(config: unknown): config is CustomProgramConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    (config as Record<string, unknown>).type === 'custom'
  )
}
