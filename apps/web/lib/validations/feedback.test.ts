import { describe, expect, it } from 'vitest'
import { feedbackSubmissionSchema } from './feedback'

describe('feedbackSubmissionSchema', () => {
  it('trims valid feedback payloads', () => {
    const result = feedbackSubmissionSchema.safeParse({
      category: ' bug ',
      message: '  The set logger saved the wrong rep count.  ',
      sourcePath: ' /settings ',
    })

    expect(result.success).toBe(true)

    if (!result.success) {
      return
    }

    expect(result.data).toEqual({
      category: 'bug',
      message: 'The set logger saved the wrong rep count.',
      sourcePath: '/settings',
    })
  })

  it('requires a supported category', () => {
    const result = feedbackSubmissionSchema.safeParse({
      category: '',
      message: 'This is enough detail to submit.',
    })

    expect(result.success).toBe(false)

    if (result.success) {
      return
    }

    expect(result.error.issues[0]?.message).toBe('Choose a feedback type.')
  })

  it('rejects short messages', () => {
    const result = feedbackSubmissionSchema.safeParse({
      category: 'bug',
      message: 'Too short',
    })

    expect(result.success).toBe(false)

    if (result.success) {
      return
    }

    expect(result.error.issues[0]?.message).toBe('Add at least 10 characters so we have enough context.')
  })

  it('rejects invalid source paths', () => {
    const result = feedbackSubmissionSchema.safeParse({
      category: 'feature_request',
      message: 'Please add a faster way to review the current cycle.',
      sourcePath: 'settings',
    })

    expect(result.success).toBe(false)

    if (result.success) {
      return
    }

    expect(result.error.issues[0]?.message).toBe('Source path must start with /.')
  })
})