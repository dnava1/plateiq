import { z } from 'zod'

export const createExerciseSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  category: z.enum(['main', 'accessory']),
  movement_pattern: z.enum(['push', 'pull', 'hinge', 'squat', 'single_leg', 'core', 'other']),
})

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>
