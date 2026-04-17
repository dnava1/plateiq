import { describe, expect, it } from 'vitest'
import { getTemplate } from '@/lib/constants/templates'
import {
  buildBuilderDraftFromProgramDefinition,
  buildEditableConfigFromTemplate,
  resolveEditableProgramDefinition,
} from './editable'

describe('editable program definitions', () => {
  it('materializes template variations into editable day blocks and preserves week schemes', () => {
    const template = getTemplate('wendler_531')

    expect(template).toBeDefined()

    const definition = buildEditableConfigFromTemplate(template!, {
      variationKey: 'bbb',
    })

    expect(definition.metadata).toEqual({
      source_template_key: 'wendler_531',
      selected_variation_key: 'bbb',
    })
    expect(definition.week_schemes).toEqual(template!.week_schemes)
    expect(definition.days).toHaveLength(template!.days.length)
    expect(definition.days[0]?.exercise_blocks).toHaveLength(2)
    expect(definition.days[0]?.exercise_blocks[1]?.exercise_key).toBe('ohp')
  })

  it('resolves a standard template-backed program into a builder-ready editable definition', () => {
    const definition = resolveEditableProgramDefinition({
      id: 7,
      name: '5/3/1 Leader',
      template_key: 'wendler_531',
      config: {
        variation_key: 'bbb',
        tm_percentage: 0.9,
        rounding: 5,
      },
      is_active: true,
    })

    expect(definition).not.toBeNull()
    expect(definition?.metadata?.source_template_key).toBe('wendler_531')
    expect(definition?.metadata?.selected_variation_key).toBe('bbb')

    const draft = buildBuilderDraftFromProgramDefinition('5/3/1 Leader', definition!)

    expect(draft.name).toBe('5/3/1 Leader')
    expect(draft.week_schemes).toEqual(definition?.week_schemes)
    expect(draft.days[0]?.exercise_blocks[1]?.exercise_key).toBe('ohp')
  })
})