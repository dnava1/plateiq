import { z } from 'zod'

export const setTrainingMaxSchema = z.object({
  exerciseId: z.number().int().positive(),
  weightLbs: z.number().positive('Weight must be positive').max(2000, 'Weight cannot exceed 2000 lbs'),
  tmPercentage: z.number().min(0.5).max(1.0),
  effectiveDate: z.string().optional(),
})

export type SetTrainingMaxInput = z.infer<typeof setTrainingMaxSchema>
