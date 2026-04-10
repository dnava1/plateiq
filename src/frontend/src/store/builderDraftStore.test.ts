import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_LINEAR_INCREMENT_LBS, useBuilderDraftStore } from './builderDraftStore'

describe('builderDraftStore', () => {
  beforeEach(() => {
    useBuilderDraftStore.getState().resetDraft()
  })

  it('normalizes missing linear increments when serializing a custom program', () => {
    const draft = useBuilderDraftStore.getState().draft

    useBuilderDraftStore.setState({
      draft: {
        ...draft,
        progression: {
          style: 'linear_per_cycle',
        },
      },
    })

    const config = useBuilderDraftStore.getState().toConfig()

    expect(config.progression.increment_lbs).toEqual(DEFAULT_LINEAR_INCREMENT_LBS)
  })

  it('omits increments from non-linear configs without deleting them from draft state', () => {
    const customIncrements = { upper: 7.5, lower: 15 }
    const draft = useBuilderDraftStore.getState().draft

    useBuilderDraftStore.setState({
      draft: {
        ...draft,
        progression: {
          style: 'wave',
          increment_lbs: customIncrements,
        },
      },
    })

    expect(useBuilderDraftStore.getState().draft.progression.increment_lbs).toEqual(customIncrements)
    expect(useBuilderDraftStore.getState().toConfig().progression.increment_lbs).toBeUndefined()
  })
})