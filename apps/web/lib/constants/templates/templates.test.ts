import { describe, it, expect } from 'vitest'
import {
  TEMPLATE_REGISTRY,
  getTemplate,
  getTemplatesByLevel,
} from '@/lib/constants/templates'

describe('TEMPLATE_REGISTRY', () => {
  it('contains exactly 15 templates', () => {
    expect(Object.keys(TEMPLATE_REGISTRY)).toHaveLength(15)
  })

  it('every template has the required fields', () => {
    for (const [key, template] of Object.entries(TEMPLATE_REGISTRY)) {
      expect(template.key).toBe(key)
      expect(template.name).toBeTruthy()
      expect(['beginner', 'intermediate', 'advanced']).toContain(template.level)
      expect(template.days_per_week).toBeGreaterThan(0)
      expect(template.cycle_length_weeks).toBeGreaterThan(0)
      expect(Array.isArray(template.days)).toBe(true)
      expect(template.days.length).toBeGreaterThan(0)
      expect(Array.isArray(template.required_exercises)).toBe(true)
      expect(template.required_exercises.length).toBeGreaterThan(0)
    }
  })

  it('groups templates correctly by level', () => {
    const beginners = getTemplatesByLevel('beginner')
    const intermediates = getTemplatesByLevel('intermediate')
    const advanced = getTemplatesByLevel('advanced')

    expect(beginners.length).toBeGreaterThan(0)
    expect(intermediates.length).toBeGreaterThan(0)
    expect(advanced.length).toBeGreaterThan(0)
    expect(beginners.length + intermediates.length + advanced.length).toBe(15)

    beginners.forEach((t) => expect(t.level).toBe('beginner'))
    intermediates.forEach((t) => expect(t.level).toBe('intermediate'))
    advanced.forEach((t) => expect(t.level).toBe('advanced'))
  })

  it('getTemplate returns the correct template', () => {
    const template = getTemplate('wendler_531')
    expect(template).toBeDefined()
    expect(template?.name).toBe("Wendler's 5/3/1")
    expect(template?.level).toBe('intermediate')
  })

  it('getTemplate returns undefined for unknown key', () => {
    expect(getTemplate('nonexistent_program')).toBeUndefined()
  })

  it('Wendler 531 has supplement options', () => {
    const template = getTemplate('wendler_531')
    expect(template?.supplement_options).toBeDefined()
    expect(template!.supplement_options!.length).toBeGreaterThan(0)
    const keys = template!.supplement_options!.map((s) => s.key)
    expect(keys).toContain('bbb')
    expect(keys).toContain('fsl')
  })

  it('Starting Strength has no supplement options', () => {
    const template = getTemplate('starting_strength')
    expect(template).toBeDefined()
    const hasSupplements = (template?.supplement_options?.length ?? 0) > 0
    expect(hasSupplements).toBe(false)
  })

  it('all templates have at least one day with at least one exercise block', () => {
    for (const template of Object.values(TEMPLATE_REGISTRY)) {
      for (const day of template.days) {
        expect(day.label).toBeTruthy()
        expect(day.exercise_blocks.length).toBeGreaterThan(0)
      }
    }
  })

  it('all supplement options have valid structure', () => {
    for (const template of Object.values(TEMPLATE_REGISTRY)) {
      if (!template.supplement_options) continue
      for (const option of template.supplement_options) {
        expect(option.key).toBeTruthy()
        expect(option.name).toBeTruthy()
        expect(option.description).toBeTruthy()
        expect(Array.isArray(option.blocks)).toBe(true)
        expect(option.blocks.length).toBeGreaterThan(0)
      }
    }
  })
})
