import { describe, expect, it } from 'vitest'
import { createInitialBuilderDraft } from '@/store/builderDraftStore'
import { validateBuilderDraftForStep } from './builderNavigation'

describe('builderNavigation', () => {
  it('blocks forward navigation when basics are invalid', () => {
    const result = validateBuilderDraftForStep(createInitialBuilderDraft(), 'review')

    expect(result.blockedStep).toBe('basics')
    expect(result.error).toBe('Give your program a name with at least 2 characters.')
  })

  it('sends review jumps to the first invalid exercise day', () => {
    const draft = createInitialBuilderDraft({
      name: 'Bridge Block',
      days_per_week: 2,
    })

    const result = validateBuilderDraftForStep(draft, 'review')

    expect(result.blockedStep).toBe('exercises')
    expect(result.blockedDayIndex).toBe(0)
    expect(result.error).toBe('Add at least one exercise to Day 1 before continuing.')
  })

  it('allows later steps when the draft is already valid', () => {
    const draft = createInitialBuilderDraft({
      name: 'Bridge Block',
      days_per_week: 1,
      days: [
        {
          label: 'Day 1',
          exercise_blocks: [
            {
              role: 'primary',
              exercise_key: 'Squat',
              sets: [
                {
                  sets: 3,
                  reps: 5,
                  intensity: 135,
                  intensity_type: 'fixed_weight',
                },
              ],
            },
          ],
        },
      ],
    })

    const result = validateBuilderDraftForStep(draft, 'review')

    expect(result.blockedStep).toBeUndefined()
    expect(result.error).toBeNull()
    expect(result.normalizedDraft.days).toHaveLength(1)
  })
})
