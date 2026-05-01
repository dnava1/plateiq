import { z } from 'zod'

const MIN_TM_PERCENTAGE = 0.5
const MAX_TM_PERCENTAGE = 1

export function normalizeTrainingMaxPercentage(value: number) {
  return value > MAX_TM_PERCENTAGE ? value / 100 : value
}

export function resolveTrainingMaxPercentageRatio(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }

  const normalizedValue = normalizeTrainingMaxPercentage(value)

  return normalizedValue >= MIN_TM_PERCENTAGE && normalizedValue <= MAX_TM_PERCENTAGE
    ? normalizedValue
    : null
}

const tmPercentageSchema = z.number({ error: 'Enter a training max percentage.' })
  .transform(normalizeTrainingMaxPercentage)
  .refine(
    (value) => value >= MIN_TM_PERCENTAGE && value <= MAX_TM_PERCENTAGE,
    'Choose a training max percentage between 50% and 100%.',
  )

export const setTrainingMaxSchema = z.object({
  exerciseId: z.number().int().positive(),
  weightLbs: z.number().positive('Weight must be positive'),
  tmPercentage: tmPercentageSchema,
  effectiveDate: z.string().optional(),
})

export type SetTrainingMaxInput = z.infer<typeof setTrainingMaxSchema>
