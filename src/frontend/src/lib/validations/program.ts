import { z } from 'zod'

export const createProgramSchema = z.object({
  template_key: z.string().min(1, 'Select a program template'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  supplement_key: z.string().optional(),
  rounding: z.number().min(1).max(10),
  tm_percentage: z.number().min(0.7).max(1.0),
})

export type CreateProgramInput = z.infer<typeof createProgramSchema>
