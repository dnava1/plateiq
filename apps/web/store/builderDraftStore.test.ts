import { beforeEach, describe, expect, it } from 'vitest'
import { getTemplate } from '@/lib/constants/templates'
import {
  buildBuilderDraftFromProgramDefinition,
  buildEditableConfigFromTemplate,
  createProgramBuilderDraftSource,
  createTemplateBuilderDraftSource,
} from '@/lib/programs/editable'
import {
  createInitialBuilderDraft,
  DEFAULT_LINEAR_INCREMENT_LBS,
  resolveBuilderProgrammingMethod,
  useBuilderDraftStore,
  usesTrainingMaxForMethod,
} from './builderDraftStore'

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

  it('preserves editable metadata and week schemes when hydrating from a template source', () => {
    const template = getTemplate('wendler_531')
    const definition = buildEditableConfigFromTemplate(template!, { variationKey: 'bbb' })
    const draft = buildBuilderDraftFromProgramDefinition("Wendler's 5/3/1", definition)

    useBuilderDraftStore.getState().hydrateDraft(draft, createTemplateBuilderDraftSource('wendler_531'))

    const config = useBuilderDraftStore.getState().toConfig()

    expect(config.week_schemes).toEqual(definition.week_schemes)
    expect(config.metadata).toEqual(definition.metadata)
    expect(config.week_schemes?.['2']).not.toBe(definition.week_schemes?.['2'])
    expect(config.week_schemes?.['2']?.days?.[0]).not.toBe(definition.week_schemes?.['2']?.days?.[0])
  })

  it('normalizes blank week labels back to defaults when serializing a custom program', () => {
    const draft = useBuilderDraftStore.getState().draft

    useBuilderDraftStore.setState({
      draft: {
        ...draft,
        cycle_length_weeks: 2,
        week_schemes: {
          1: { label: 'Week 1 - Base' },
          2: { label: '' },
        },
      },
    })

    const config = useBuilderDraftStore.getState().toConfig()

    expect(config.week_schemes?.['1']?.label).toBe('Week 1 - Base')
    expect(config.week_schemes?.['2']?.label).toBe('Week 2')
  })

  it('updates source metadata without overwriting the current draft', () => {
    useBuilderDraftStore.getState().patchDraft({ name: 'Edited Draft' })

    useBuilderDraftStore.getState().patchSource(
      createProgramBuilderDraftSource(
        {
          id: 42,
          name: 'Saved Program',
          template_key: 'custom',
          is_active: true,
        },
        'revision',
      ),
    )

    const state = useBuilderDraftStore.getState()

    expect(state.draft.name).toBe('Edited Draft')
    expect(state.source?.save_strategy).toBe('revision')
    expect(state.source?.program_id).toBe(42)
  })

  it('creates scratch drafts from the selected programming method without changing the compatibility shape', () => {
    const tmDrivenDraft = createInitialBuilderDraft({ uses_training_max: usesTrainingMaxForMethod('tm_driven') })
    const generalDraft = createInitialBuilderDraft({ uses_training_max: usesTrainingMaxForMethod('general') })

    expect(resolveBuilderProgrammingMethod(tmDrivenDraft.uses_training_max)).toBe('tm_driven')
    expect(resolveBuilderProgrammingMethod(generalDraft.uses_training_max)).toBe('general')
    expect(tmDrivenDraft.tm_percentage).toBe(0.9)
    expect(generalDraft.tm_percentage).toBe(0.9)
  })
})
