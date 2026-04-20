import { z } from 'zod'

export const feedbackCategories = ['bug', 'feature_request', 'confusing_guidance', 'other'] as const

export type FeedbackCategory = (typeof feedbackCategories)[number]

export const feedbackCategoryOptions: ReadonlyArray<{
  value: FeedbackCategory
  label: string
}> = [
  { value: 'bug', label: 'Bug report' },
  { value: 'feature_request', label: 'Feature request' },
  { value: 'confusing_guidance', label: 'Confusing guidance or insight' },
  { value: 'other', label: 'Other' },
]

const feedbackCategorySchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z.enum(feedbackCategories, { error: 'Choose a feedback type.' }),
)

const feedbackMessageSchema = z
  .string({ error: 'Describe what happened.' })
  .trim()
  .min(10, 'Add at least 10 characters so we have enough context.')
  .max(2000, 'Keep feedback under 2000 characters.')

const feedbackSourcePathSchema = z
  .string({ error: 'Source path must be a string.' })
  .trim()
  .min(1, 'Source path is required.')
  .max(200, 'Source path must be 200 characters or fewer.')
  .refine((value) => value.startsWith('/'), 'Source path must start with /.')

export const feedbackSubmissionSchema = z.object({
  category: feedbackCategorySchema,
  message: feedbackMessageSchema,
  sourcePath: feedbackSourcePathSchema.optional().default('/settings'),
})

export type FeedbackSubmissionInput = z.input<typeof feedbackSubmissionSchema>
export type FeedbackSubmissionPayload = z.output<typeof feedbackSubmissionSchema>