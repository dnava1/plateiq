'use client'

import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { useDeferredValue, useId, useState } from 'react'
import Link from 'next/link'
import { getTemplatesByLevel } from '@/lib/constants/templates'
import { resolveProgramDays } from '@/lib/programs/week'
import { cn, formatDaysPerWeek, formatExerciseKey, formatWeekCycle, normalizeCadenceCopy } from '@/lib/utils'
import type { ProgramTemplate } from '@/types/template'
import type { ProgramLevel } from '@/types/domain'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Hammer, Info, Search, SearchX } from 'lucide-react'

const LEVEL_LABELS: Record<ProgramLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

const LEVEL_ORDER: ProgramLevel[] = ['beginner', 'intermediate', 'advanced']
const ALL_LEVEL_FILTER = 'all'
const ALL_DAYS_FILTER = 'all'

interface TemplatePickerProps {
  selectedKey: string | null
  onSelect: (key: string) => void
  onOpenChange?: (open: boolean) => void
}

export function TemplatePicker({ selectedKey, onSelect, onOpenChange }: TemplatePickerProps) {
  const searchFieldId = useId()
  const [expandedTemplateKey, setExpandedTemplateKey] = useState<string | null>(null)
  const [levelFilter, setLevelFilter] = useState<ProgramLevel | 'all'>(ALL_LEVEL_FILTER)
  const [daysFilter, setDaysFilter] = useState<string>(ALL_DAYS_FILTER)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim().toLowerCase())
  const allTemplates = LEVEL_ORDER.flatMap((level) => getTemplatesByLevel(level))
  const availableDayFilters = [...new Set(allTemplates.map((template) => template.days_per_week))].sort((a, b) => a - b)
  const filteredTemplates = allTemplates.filter((template) => {
    const matchesLevel = levelFilter === ALL_LEVEL_FILTER || template.level === levelFilter
    const matchesDays = daysFilter === ALL_DAYS_FILTER || template.days_per_week === Number(daysFilter)
    const requiredLifts = template.required_exercises.map(formatExerciseKey).join(' ').toLowerCase()
    const searchContent = [
      template.name,
      template.description,
      requiredLifts,
      template.variation_options?.map((option) => `${option.name} ${option.description}`).join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const matchesSearch = deferredSearch.length === 0 || searchContent.includes(deferredSearch)

    return matchesLevel && matchesDays && matchesSearch
  })
  const visibleSections = LEVEL_ORDER.map((level) => ({
    level,
    templates: filteredTemplates.filter((template) => template.level === level),
  })).filter((section) => section.templates.length > 0)
  const hasFiltersApplied = search.length > 0 || levelFilter !== ALL_LEVEL_FILTER || daysFilter !== ALL_DAYS_FILTER

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[24px] border border-border/70 bg-card/70 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">Find a starting point</p>
            <p className="text-xs leading-5 text-muted-foreground">
              Filter by difficulty or training frequency, then select a template to jump into setup below.
            </p>
          </div>

          <div className="relative">
            <Label htmlFor={searchFieldId} className="sr-only">Search program templates</Label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={searchFieldId}
              type="search"
              role="searchbox"
              placeholder="Search templates, lifts, or variation notes"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9 pr-10"
            />
            {search.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setSearch('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2"
                aria-label="Clear template search"
              >
                <SearchX className="size-4" />
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Difficulty</p>
              <ToggleGroup
                value={levelFilter}
                variant="outline"
                size="sm"
                className="flex flex-wrap gap-2"
                onValueChange={(value) => {
                  if (value) {
                    setLevelFilter(value as ProgramLevel | 'all')
                  }
                }}
              >
                <ToggleGroupItem value={ALL_LEVEL_FILTER}>All Levels</ToggleGroupItem>
                {LEVEL_ORDER.map((level) => (
                  <ToggleGroupItem key={level} value={level}>{LEVEL_LABELS[level]}</ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Days per Week</p>
              <ToggleGroup
                value={daysFilter}
                variant="outline"
                size="sm"
                className="flex flex-wrap gap-2"
                onValueChange={(value) => {
                  if (value) {
                    setDaysFilter(value)
                  }
                }}
              >
                <ToggleGroupItem value={ALL_DAYS_FILTER}>Any Split</ToggleGroupItem>
                {availableDayFilters.map((daysPerWeek) => (
                  <ToggleGroupItem key={daysPerWeek} value={String(daysPerWeek)}>
                    {daysPerWeek} day{daysPerWeek > 1 ? 's' : ''}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>
        </div>
      </div>

      <RadioGroup
        value={selectedKey ?? ''}
        aria-label="Program templates"
        onValueChange={onSelect}
        className="flex flex-col gap-6"
      >
        {visibleSections.length > 0 ? visibleSections.map(({ level, templates }) => (
          <div key={level} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="eyebrow">{LEVEL_LABELS[level]}</h3>
              <Badge variant="outline" className="rounded-full px-2.5">
                {templates.length} templates
              </Badge>
            </div>
            <div className="grid gap-3">
              {templates.map((template) => (
                <TemplateCard
                  key={template.key}
                  template={template}
                  isExpanded={expandedTemplateKey === template.key}
                  isSelected={selectedKey === template.key}
                  onToggleDetails={() => {
                    setExpandedTemplateKey((currentKey) => currentKey === template.key ? null : template.key)
                  }}
                />
              ))}
            </div>
          </div>
        )) : (
          <div className="rounded-[24px] border border-dashed border-border/70 bg-card/50 p-5 text-sm text-muted-foreground">
            <p>No templates match the current filters.</p>
            {hasFiltersApplied ? (
              <Button
                type="button"
                variant="link"
                className="mt-1 h-auto p-0 text-sm"
                onClick={() => {
                  setDaysFilter(ALL_DAYS_FILTER)
                  setLevelFilter(ALL_LEVEL_FILTER)
                  setSearch('')
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        )}
      </RadioGroup>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="eyebrow">Build From Scratch</h3>
          <Badge variant="secondary">Custom</Badge>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Open the builder once, then decide inside basics whether the block stays general or becomes training-max driven.
        </p>
        <div className="grid gap-3">
          <ScratchBuilderLink
            href="/programs/builder"
            title="Open Program Builder"
            description="Start with the split, exercises, and progression, then switch training-max behavior on only if the method actually needs it."
            icon={Hammer}
            onOpenChange={onOpenChange}
          />
        </div>
      </div>
    </div>
  )
}

interface ScratchBuilderLinkProps {
  href: string
  title: string
  description: string
  icon: typeof Hammer
  onOpenChange?: (open: boolean) => void
}

function ScratchBuilderLink({ href, title, description, icon: Icon, onOpenChange }: ScratchBuilderLinkProps) {
  return (
    <Link
      href={href}
      onClick={() => onOpenChange?.(false)}
      className="card-hover w-full rounded-[24px] border border-dashed border-border/80 bg-card/70 p-5 text-left hover:border-primary/40 hover:bg-primary/5"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon data-icon="inline-start" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-base font-medium tracking-[-0.04em] text-foreground">{title}</p>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  )
}

interface TemplateCardProps {
  template: ProgramTemplate
  isExpanded: boolean
  isSelected: boolean
  onToggleDetails: () => void
}

function TemplateCard({ template, isExpanded, isSelected, onToggleDetails }: TemplateCardProps) {
  const requiredLifts = template.required_exercises.map(formatExerciseKey).join(', ')
  const description = normalizeCadenceCopy(template.description)
  const weeklyStructure = Array.from({ length: template.cycle_length_weeks }, (_, index) => {
    const weekNumber = index + 1
    const schemeLabel = template.week_schemes?.[weekNumber]?.label

    return {
      weekNumber,
      label: schemeLabel ?? `Week ${weekNumber}`,
      days: resolveProgramDays(template, weekNumber),
    }
  })
  const showPerWeekStructure = Boolean(template.week_schemes && weeklyStructure.length > 0)

  return (
    <div
      className={cn(
        'rounded-[24px] border bg-card/70 transition-colors',
        isSelected ? 'border-primary/40 bg-primary/5 shadow-sm' : 'border-border/70',
      )}
    >
      <div className="relative">
        <Radio.Root
          value={template.key}
          nativeButton
          render={<button />}
          className="card-hover w-full rounded-[24px] p-5 pr-14 text-left transition-colors outline-none hover:bg-muted/35 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-medium tracking-[-0.04em] text-foreground">{template.name}</span>
              {isSelected ? <Badge variant="secondary" className="text-xs">Selected</Badge> : null}
              <Badge variant="outline" className="text-xs">
                {formatDaysPerWeek(template.days_per_week)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {formatWeekCycle(template.cycle_length_weeks)}
              </Badge>
              {template.uses_training_max ? (
                <Badge variant="outline" className="text-xs">
                  TM based
                </Badge>
              ) : null}
              {template.variation_options && template.variation_options.length > 0 ? (
                <Badge variant="secondary" className="text-xs">
                  {template.variation_options.length} variation{template.variation_options.length > 1 ? 's' : ''}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
            <p className="text-xs leading-5 text-muted-foreground">
              Lifts: {requiredLifts}
            </p>
            {isSelected ? (
              <p className="text-xs font-medium text-primary">
                Selected. Setup opens below so you can name it and adjust template options.
              </p>
            ) : null}
          </div>
        </Radio.Root>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Template details for ${template.name}`}
          aria-expanded={isExpanded}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onToggleDetails()
          }}
          className={cn(
            'absolute right-3 top-3',
            isExpanded && 'bg-primary/10 text-primary hover:bg-primary/15',
          )}
        >
          <Info className="size-4" />
        </Button>
      </div>

      {isExpanded ? (
        <div className="flex flex-col gap-4 border-t border-border/70 px-5 pb-5 pt-4">
          {template.uses_training_max ? (
            <p className="text-xs leading-5 text-muted-foreground">
              Uses training-max loading with a default working percentage of {Math.round((template.default_tm_percentage ?? 0.9) * 100)}%.
            </p>
          ) : null}

          <div className="flex flex-col gap-2 text-sm">
            <p className="font-medium text-foreground">Weekly structure</p>
            {showPerWeekStructure ? (
              <div className="flex flex-col gap-3">
                {weeklyStructure.map((week) => (
                  <div key={`${template.key}-week-${week.weekNumber}`} className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
                      {week.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {week.days.map((day, index) => (
                        <span
                          key={`${template.key}-${week.weekNumber}-${day.label}-${index}`}
                          className="rounded-full bg-background px-2.5 py-1 text-xs text-muted-foreground"
                        >
                          {day.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {template.days.map((day, index) => (
                  <span
                    key={`${template.key}-${day.label}-${index}`}
                    className="rounded-full bg-background px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {day.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {template.variation_options && template.variation_options.length > 0 ? (
            <div className="flex flex-col gap-2 text-sm">
              <p className="font-medium text-foreground">Variation notes</p>
              <div className="flex flex-col gap-2">
                {template.variation_options.map((option) => (
                  <div key={option.key} className="rounded-[18px] bg-background/70 p-3">
                    <p className="text-sm font-medium text-foreground">{option.name}</p>
                    <p className="text-xs leading-5 text-muted-foreground">{option.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
