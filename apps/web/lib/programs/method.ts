import { getTemplate } from '@/lib/constants/templates'
import type { Tables } from '@/types/database'
import type { IntensityType } from '@/types/domain'
import type { CustomProgramConfig } from '@/types/template'
import type { ExerciseBlock, ProgramTemplate } from '@/types/template'
import { isCustomProgramConfig } from '@/types/template'

type ProgramMethodSource = Pick<Tables<'training_programs'>, 'config' | 'template_key'>
type ProgramExecutionDefinition = Pick<CustomProgramConfig, 'uses_training_max' | 'days'>
const TM_BACKED_INTENSITY_TYPES = new Set<IntensityType>(['percentage_tm', 'percentage_1rm'])

function blocksNeedTrainingMaxForExecution(blocks: ExerciseBlock[]) {
  return blocks.some((block) => block.sets.some((set) => TM_BACKED_INTENSITY_TYPES.has(set.intensity_type)))
}

function templateNeedsTrainingMaxForExecution(template: ProgramTemplate, selectedVariationKey?: string | null) {
  if (template.uses_training_max) {
    return true
  }

  if (template.days.some((day) => blocksNeedTrainingMaxForExecution(day.exercise_blocks))) {
    return true
  }

  if (!selectedVariationKey || !template.variation_options) {
    return false
  }

  const selectedVariation = template.variation_options.find((variation) => variation.key === selectedVariationKey)

  return selectedVariation ? blocksNeedTrainingMaxForExecution(selectedVariation.blocks) : false
}

function getSelectedVariationKey(rawConfig: ProgramMethodSource['config']) {
  if (!rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
    return null
  }

  const variationKey = (rawConfig as Record<string, unknown>).variation_key
  return typeof variationKey === 'string' && variationKey.trim().length > 0 ? variationKey : null
}

export function resolveDefinitionNeedsTrainingMaxForExecution(definition: ProgramExecutionDefinition) {
  return definition.days.some((day) => blocksNeedTrainingMaxForExecution(day.exercise_blocks))
}

export function resolveProgramUsesTrainingMax(program: ProgramMethodSource) {
  const rawConfig = program.config ?? null

  if (rawConfig && isCustomProgramConfig(rawConfig)) {
    return rawConfig.uses_training_max
  }

  return getTemplate(program.template_key)?.uses_training_max ?? false
}

export function resolveProgramNeedsTrainingMaxForExecution(program: ProgramMethodSource) {
  const rawConfig = program.config ?? null

  if (rawConfig && isCustomProgramConfig(rawConfig)) {
    return resolveDefinitionNeedsTrainingMaxForExecution(rawConfig)
  }

  const template = getTemplate(program.template_key)

  if (!template) {
    return false
  }

  return templateNeedsTrainingMaxForExecution(template, getSelectedVariationKey(rawConfig))
}