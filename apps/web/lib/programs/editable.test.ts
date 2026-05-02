import { describe, expect, it } from 'vitest'
import { getTemplate } from '@/lib/constants/templates'
import {
  buildBuilderDraftFromProgramDefinition,
  buildEditableConfigFromTemplate,
  rewriteCustomProgramExerciseReferences,
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
    expect(definition.days).toHaveLength(template!.days.length)
    expect(definition.days[0]?.exercise_blocks).toHaveLength(2)
    expect(definition.days[0]?.exercise_blocks[1]?.exercise_key).toBe('Overhead Press')
    expect(definition.week_schemes?.['2']?.days?.[0]?.exercise_blocks).toHaveLength(2)
    expect(definition.week_schemes?.['2']?.days?.[0]?.exercise_blocks[1]?.exercise_key).toBe('Overhead Press')
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
    expect(draft.days[0]?.exercise_blocks[1]?.exercise_key).toBe('Overhead Press')
  })

  it('does not inherit the primary exercise id for a different variation block key', () => {
    const definition = buildEditableConfigFromTemplate({
      key: 'mixed-id-template',
      name: 'Mixed Id Template',
      level: 'intermediate',
      description: 'Regression coverage for materialized variation ids.',
      days_per_week: 1,
      cycle_length_weeks: 1,
      uses_training_max: true,
      required_exercises: ['Safety Squat Bar'],
      days: [{
        label: 'Day 1',
        exercise_blocks: [{
          role: 'primary',
          exercise_id: 10,
          exercise_key: 'Safety Squat Bar',
          sets: [{ sets: 1, reps: 5, intensity: 0.8, intensity_type: 'percentage_tm' }],
        }],
      }],
      variation_options: [{
        key: 'bench-support',
        name: 'Bench Support',
        description: 'Bench support work',
        blocks: [{
          role: 'variation',
          exercise_key: 'Bench Press',
          sets: [{ sets: 1, reps: 8, intensity: 0.7, intensity_type: 'percentage_tm' }],
        }],
      }],
      progression: { style: 'custom' },
    }, {
      variationKey: 'bench-support',
    })

    expect(definition.days[0]?.exercise_blocks[1]?.exercise_key).toBe('Bench Press')
    expect(definition.days[0]?.exercise_blocks[1]?.exercise_id).toBeUndefined()
  })

  it('rewrites legacy name-only exercise references when a custom exercise is renamed', () => {
    const rewritten = rewriteCustomProgramExerciseReferences({
      type: 'custom',
      level: 'intermediate',
      days_per_week: 1,
      cycle_length_weeks: 1,
      uses_training_max: true,
      tm_percentage: 0.9,
      days: [{
        label: 'Day 1',
        exercise_blocks: [{
          role: 'primary',
          exercise_key: 'Safety Squat Bar',
          sets: [{ sets: 1, reps: 5, intensity: 0.8, intensity_type: 'percentage_tm' }],
        }],
      }],
      progression: { style: 'custom' },
    }, {
      exerciseId: 42,
      previousName: 'Safety Squat Bar',
      nextName: 'Yoke Bar Squat',
    })

    expect(rewritten.changed).toBe(true)
    expect(rewritten.config.days[0]?.exercise_blocks[0]).toMatchObject({
      exercise_id: 42,
      exercise_key: 'Yoke Bar Squat',
    })
  })

  it('does not rewrite legacy name-only blocks for a different custom exercise with a similar normalized key', () => {
    const rewritten = rewriteCustomProgramExerciseReferences({
      type: 'custom',
      level: 'intermediate',
      days_per_week: 1,
      cycle_length_weeks: 1,
      uses_training_max: true,
      tm_percentage: 0.9,
      days: [{
        label: 'Day 1',
        exercise_blocks: [
          {
            role: 'primary',
            exercise_key: 'Safety Squat Bar',
            sets: [{ sets: 1, reps: 5, intensity: 0.8, intensity_type: 'percentage_tm' }],
          },
          {
            role: 'variation',
            exercise_key: 'Safety-Squat-Bar',
            sets: [{ sets: 1, reps: 8, intensity: 0.65, intensity_type: 'percentage_tm' }],
          },
        ],
      }],
      progression: { style: 'custom' },
    }, {
      exerciseId: 42,
      previousName: 'Safety Squat Bar',
      nextName: 'Yoke Bar Squat',
    })

    expect(rewritten.changed).toBe(true)
    expect(rewritten.config.days[0]?.exercise_blocks[0]).toMatchObject({
      exercise_id: 42,
      exercise_key: 'Yoke Bar Squat',
    })
    expect(rewritten.config.days[0]?.exercise_blocks[1]?.exercise_key).toBe('Safety-Squat-Bar')
    expect(rewritten.config.days[0]?.exercise_blocks[1]).not.toHaveProperty('exercise_id')
  })
})
