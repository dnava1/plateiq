import type { IntensityType, ProgressionStyle, ProgramLevel } from './domain'

export interface SetPrescription {
  sets: number
  reps: number | string // 5 or "5+" (AMRAP) or "3-5" (range)
  reps_max?: number
  intensity: number // 0.85 = 85% TM, 8.0 = RPE 8, 135 = fixed lbs
  intensity_type: IntensityType
  display_type?: 'backoff'
  is_amrap?: boolean
  rest_seconds?: number
}

export interface ExecutionGroupMetadata {
  key: string
  label?: string
  type: 'superset' | 'circuit'
}

export interface ExerciseBlock {
  block_id?: string
  role: 'primary' | 'variation' | 'accessory'
  exercise_id?: number
  exercise_key?: string // 'squat' | 'bench' | null (user picks)
  execution_group?: ExecutionGroupMetadata
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

export interface ProgramWeekScheme {
  label: string
  intensity_modifier?: number
  days?: DayTemplate[]
}

export type ProgramWeekSchemes = Record<string, ProgramWeekScheme>

export interface EditableProgramMetadata {
  source_template_key?: string
  selected_variation_key?: string | null
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
  week_schemes?: ProgramWeekSchemes // for wave loading (5/3/1 weeks)
  variation_options?: VariationOption[]
  progression: ProgressionRule
  source_url?: string
}

export interface GeneratedSet {
  block_id: string
  block_order: number
  block_role: ExerciseBlock['role']
  exercise_key: string
  exercise_id?: number
  execution_group?: ExecutionGroupMetadata
  display_type?: 'backoff'
  set_order: number
  set_type: 'warmup' | 'main' | 'amrap' | 'variation' | 'accessory'
  weight_lbs: number
  reps_prescribed: number
  reps_prescribed_max?: number
  is_amrap: boolean
  intensity_type: IntensityType
  rest_seconds?: number
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
  days: DayTemplate[]
  week_schemes?: ProgramWeekSchemes
  progression: ProgressionRule
  metadata?: EditableProgramMetadata
}

export function isCustomProgramConfig(config: unknown): config is CustomProgramConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    (config as Record<string, unknown>).type === 'custom'
  )
}
