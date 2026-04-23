import { z } from 'zod'

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const insightListSchema = z.array(z.string().trim().min(1).max(240)).min(1).max(4)
const progressionGuidanceTextSchema = z.string().trim().min(1).max(320)

function isValidIsoDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map((part) => Number(part))
  const parsedDate = new Date(Date.UTC(year, month - 1, day))

  return parsedDate.getUTCFullYear() === year
    && parsedDate.getUTCMonth() === month - 1
    && parsedDate.getUTCDate() === day
}

function createIsoDateSchema(fieldName: 'dateFrom' | 'dateTo') {
  return z.string()
    .regex(ISO_DATE_PATTERN, `${fieldName} must use YYYY-MM-DD format.`)
    .refine(isValidIsoDate, `${fieldName} must be a real calendar date.`)
}

export const generateInsightRequestSchema = z.object({
  dateFrom: createIsoDateSchema('dateFrom'),
  dateTo: createIsoDateSchema('dateTo'),
  exerciseId: z.number().int().positive().nullable().default(null),
}).refine((value) => value.dateFrom <= value.dateTo, {
  message: 'dateTo must be on or after dateFrom.',
  path: ['dateTo'],
})

export const trainingInsightSectionsSchema = z.object({
  summary: z.string().trim().min(1).max(700),
  strengths: insightListSchema,
  concerns: insightListSchema,
  recommendations: insightListSchema,
})

export const progressionGuidanceActionSchema = z.enum(['increase', 'hold', 'repeat', 'review'])
export const progressionGuidanceMethodContextSchema = z.enum(['loaded_strength', 'training_max'])
export const progressionGuidanceBoundedReasonSchema = z.enum([
  'broader_scope',
  'unsupported_scope',
  'insufficient_coverage',
  'mixed_signal',
  'model_mismatch',
])

export const actionableProgressionGuidanceSchema = z.object({
  disposition: z.literal('actionable'),
  action: progressionGuidanceActionSchema,
  exerciseName: z.string().trim().min(1).max(160),
  methodContext: progressionGuidanceMethodContextSchema,
  rationale: progressionGuidanceTextSchema,
})

export const boundedProgressionGuidanceSchema = z.object({
  disposition: z.literal('bounded'),
  note: progressionGuidanceTextSchema,
  reason: progressionGuidanceBoundedReasonSchema,
})

export const progressionGuidanceSchema = z.discriminatedUnion('disposition', [
  actionableProgressionGuidanceSchema,
  boundedProgressionGuidanceSchema,
])

export const trainingInsightSchema = trainingInsightSectionsSchema.extend({
  progressionGuidance: progressionGuidanceSchema,
})