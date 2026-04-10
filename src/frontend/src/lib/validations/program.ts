import { z } from 'zod'

export const createProgramSchema = z.object({
  template_key: z.string().min(1, 'Select a program template'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  supplement_key: z.string().optional(),
  rounding: z.number().min(1).max(10),
  tm_percentage: z.number().min(0.7).max(1.0),
})

export type CreateProgramInput = z.infer<typeof createProgramSchema>

const setPrescriptionSchema = z.object({
  sets: z.number().int().min(1).max(20),
  reps: z.union([z.number().int().min(1).max(100), z.string().regex(/^\d+\+?$|^\d+-\d+$/)]),
  reps_max: z.number().int().min(1).max(100).optional(),
  intensity: z.number().min(0).max(10000),
  intensity_type: z.enum(['percentage_tm', 'percentage_1rm', 'rpe', 'fixed_weight', 'bodyweight', 'percentage_work_set']),
  is_amrap: z.boolean().optional(),
  rest_seconds: z.number().int().min(0).max(600).optional(),
})

const exerciseBlockSchema = z.object({
  role: z.enum(['primary', 'supplement', 'accessory']),
  exercise_key: z.string().min(1).optional(),
  sets: z.array(setPrescriptionSchema).min(1),
  notes: z.string().max(500).optional(),
})

const customDaySchema = z.object({
  label: z.string().min(1).max(100),
  exercise_blocks: z.array(exerciseBlockSchema).min(1),
})

const progressionRuleSchema = z.object({
  style: z.enum(['linear_per_session', 'linear_per_week', 'linear_per_cycle', 'percentage_cycle', 'wave', 'autoregulated', 'custom']),
  increment_lbs: z.object({ upper: z.number().min(0).max(50), lower: z.number().min(0).max(50) }).optional(),
  deload_trigger: z.string().optional(),
  deload_strategy: z.string().optional(),
})

export const customProgramConfigSchema = z.object({
  type: z.literal('custom'),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  days_per_week: z.number().int().min(1).max(7),
  cycle_length_weeks: z.number().int().min(1).max(16),
  uses_training_max: z.boolean(),
  tm_percentage: z.number().min(0.70).max(1.00).optional(),
  rounding: z.number().min(1).max(10).optional(),
  days: z.array(customDaySchema).min(1).max(7),
  progression: progressionRuleSchema,
})

export const createCustomProgramSchema = z.object({
  name: z.string().min(2).max(100),
  definition: customProgramConfigSchema,
})

export type CreateCustomProgramInput = z.infer<typeof createCustomProgramSchema>
