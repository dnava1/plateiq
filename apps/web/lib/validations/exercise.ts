import { z } from 'zod'

export const createExerciseSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  category: z.enum(['main', 'accessory']),
  movement_pattern: z.enum(['horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'hinge', 'squat', 'lunge', 'core', 'other']),
  analytics_track: z.enum(['standard', 'bodyweight_review']),
})

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>
