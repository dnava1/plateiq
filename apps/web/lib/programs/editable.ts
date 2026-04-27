import { getTemplate } from '@/lib/constants/templates'
import type { BuilderDraft } from '@/store/builderDraftStore'
import type { Tables } from '@/types/database'
import {
  isCustomProgramConfig,
  type CustomProgramConfig,
  type DayTemplate,
  type EditableProgramMetadata,
  type ExerciseBlock,
  type ProgramTemplate,
  type ProgramWeekSchemes,
  type ProgressionRule,
  type SetPrescription,
} from '@/types/template'

const DEFAULT_TM_PERCENTAGE = 0.9

interface StandardProgramConfig {
  variation_key?: string | null
  rounding?: number
  tm_percentage?: number
}

export type ProgramRecordForEditing = Pick<
  Tables<'training_programs'>,
  'id' | 'name' | 'template_key' | 'config' | 'is_active'
>

export type BuilderDraftOriginKind = 'scratch' | 'template' | 'program'
export type ProgramSaveStrategy = 'create' | 'update' | 'revision'

export interface BuilderDraftSource {
  kind: BuilderDraftOriginKind
  mode: 'create' | 'edit'
  template_key: string
  program_id?: number
  program_name?: string
  is_active?: boolean
  save_strategy: ProgramSaveStrategy
  has_workout_history?: boolean
}

export interface TemplateDraftHydrationOptions {
  name?: string | null
  variationKey?: string | null
  tmPercentage?: number | null
}

function cloneSetPrescription(set: SetPrescription): SetPrescription {
  return { ...set }
}

function cloneExerciseBlock(block: ExerciseBlock): ExerciseBlock {
  return {
    ...block,
    sets: block.sets.map(cloneSetPrescription),
  }
}

function cloneDayTemplate(day: DayTemplate): DayTemplate {
  return {
    ...day,
    exercise_blocks: day.exercise_blocks.map(cloneExerciseBlock),
  }
}

function cloneProgressionRule(rule: ProgressionRule): ProgressionRule {
  return {
    ...rule,
    increment_lbs: rule.increment_lbs ? { ...rule.increment_lbs } : undefined,
  }
}

export function cloneWeekSchemes(weekSchemes: ProgramWeekSchemes | undefined) {
  if (!weekSchemes) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(weekSchemes).map(([weekNumber, scheme]) => [
      weekNumber,
      {
        ...scheme,
        days: scheme.days?.map(cloneDayTemplate),
      },
    ]),
  ) as ProgramWeekSchemes
}

export function cloneEditableProgramMetadata(metadata: EditableProgramMetadata | undefined) {
  return metadata ? { ...metadata } : undefined
}

function parseStandardProgramConfig(config: ProgramRecordForEditing['config']): StandardProgramConfig {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return {}
  }

  return config as StandardProgramConfig
}

function resolveVariationBlocks(template: ProgramTemplate, variationKey: string | null | undefined) {
  if (!variationKey) {
    return []
  }

  return template.variation_options?.find((variation) => variation.key === variationKey)?.blocks ?? []
}

function materializeTemplateDay(day: DayTemplate, variationBlocks: ExerciseBlock[]) {
  const primaryBlock = day.exercise_blocks.find((block) => block.role === 'primary') ?? day.exercise_blocks[0]
  const primaryExerciseKey = primaryBlock?.exercise_key
  const primaryExerciseId = primaryBlock?.exercise_id

  return {
    ...cloneDayTemplate(day),
    exercise_blocks: [
      ...day.exercise_blocks.map(cloneExerciseBlock),
      ...variationBlocks.map((block) => ({
        ...cloneExerciseBlock(block),
        exercise_key: block.exercise_key ?? primaryExerciseKey,
        exercise_id: block.exercise_id ?? primaryExerciseId,
      })),
    ],
  }
}

function materializeWeekSchemes(weekSchemes: ProgramWeekSchemes | undefined, variationBlocks: ExerciseBlock[]) {
  if (!weekSchemes) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(weekSchemes).map(([weekNumber, scheme]) => [
      weekNumber,
      {
        ...scheme,
        days: scheme.days?.map((day) => materializeTemplateDay(day, variationBlocks)),
      },
    ]),
  ) as ProgramWeekSchemes
}

export function buildEditableConfigFromTemplate(
  template: ProgramTemplate,
  options: TemplateDraftHydrationOptions = {},
): CustomProgramConfig {
  const variationBlocks = resolveVariationBlocks(template, options.variationKey)

  return {
    type: 'custom',
    level: template.level,
    days_per_week: template.days_per_week,
    cycle_length_weeks: template.cycle_length_weeks,
    uses_training_max: template.uses_training_max,
    tm_percentage: template.uses_training_max
      ? options.tmPercentage ?? template.default_tm_percentage ?? DEFAULT_TM_PERCENTAGE
      : undefined,
    days: template.days.map((day) => materializeTemplateDay(day, variationBlocks)),
    week_schemes: materializeWeekSchemes(template.week_schemes, variationBlocks),
    progression: cloneProgressionRule(template.progression),
    metadata: {
      source_template_key: template.key,
      selected_variation_key: options.variationKey ?? null,
    },
  }
}

export function normalizeEditableProgramConfig(
  config: CustomProgramConfig,
  templateKey: string,
): CustomProgramConfig {
  const sourceTemplateKey = config.metadata?.source_template_key ?? (templateKey !== 'custom' ? templateKey : undefined)

  return {
    type: 'custom',
    level: config.level,
    days_per_week: config.days_per_week,
    cycle_length_weeks: config.cycle_length_weeks,
    uses_training_max: config.uses_training_max,
    tm_percentage: config.uses_training_max
      ? config.tm_percentage ?? DEFAULT_TM_PERCENTAGE
      : undefined,
    days: config.days.map(cloneDayTemplate),
    week_schemes: cloneWeekSchemes(config.week_schemes),
    progression: cloneProgressionRule(config.progression),
    metadata: sourceTemplateKey || config.metadata?.selected_variation_key !== undefined
      ? {
          ...cloneEditableProgramMetadata(config.metadata),
          source_template_key: sourceTemplateKey,
        }
      : undefined,
  }
}

export function resolveEditableProgramDefinition(program: ProgramRecordForEditing) {
  const rawConfig = program.config ?? null

  if (rawConfig && isCustomProgramConfig(rawConfig)) {
    return normalizeEditableProgramConfig(rawConfig, program.template_key)
  }

  const template = getTemplate(program.template_key)
  if (!template) {
    return null
  }

  const config = parseStandardProgramConfig(rawConfig)

  return buildEditableConfigFromTemplate(template, {
    variationKey: config.variation_key ?? null,
    tmPercentage: config.tm_percentage,
  })
}

export function buildBuilderDraftFromProgramDefinition(
  name: string,
  definition: CustomProgramConfig,
): BuilderDraft {
  return {
    name,
    level: definition.level,
    days_per_week: definition.days_per_week,
    cycle_length_weeks: definition.cycle_length_weeks,
    uses_training_max: definition.uses_training_max,
    tm_percentage: definition.tm_percentage ?? DEFAULT_TM_PERCENTAGE,
    days: definition.days.map(cloneDayTemplate),
    week_schemes: cloneWeekSchemes(definition.week_schemes),
    progression: cloneProgressionRule(definition.progression),
    metadata: cloneEditableProgramMetadata(definition.metadata),
  }
}

export function createScratchBuilderDraftSource(): BuilderDraftSource {
  return {
    kind: 'scratch',
    mode: 'create',
    template_key: 'custom',
    save_strategy: 'create',
  }
}

export function createTemplateBuilderDraftSource(templateKey: string): BuilderDraftSource {
  return {
    kind: 'template',
    mode: 'create',
    template_key: templateKey,
    save_strategy: 'create',
  }
}

export function createProgramBuilderDraftSource(
  program: Pick<ProgramRecordForEditing, 'id' | 'name' | 'template_key' | 'is_active'>,
  saveStrategy: ProgramSaveStrategy,
  hasWorkoutHistory: boolean = false,
): BuilderDraftSource {
  return {
    kind: 'program',
    mode: 'edit',
    template_key: program.template_key,
    program_id: program.id,
    program_name: program.name,
    is_active: program.is_active,
    save_strategy: saveStrategy,
    has_workout_history: hasWorkoutHistory,
  }
}
