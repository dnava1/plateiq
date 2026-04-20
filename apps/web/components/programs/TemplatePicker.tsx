'use client'

import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import Link from 'next/link'
import { getTemplatesByLevel } from '@/lib/constants/templates'
import { formatDaysPerWeek, formatExerciseKey, formatWeekCycle, normalizeCadenceCopy } from '@/lib/utils'
import type { ProgramTemplate } from '@/types/template'
import type { ProgramLevel } from '@/types/domain'
import { Badge } from '@/components/ui/badge'
import { Gauge, Hammer } from 'lucide-react'

const LEVEL_LABELS: Record<ProgramLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

const LEVEL_ORDER: ProgramLevel[] = ['beginner', 'intermediate', 'advanced']

interface TemplatePickerProps {
  selectedKey: string | null
  onSelect: (key: string) => void
  onOpenChange?: (open: boolean) => void
}

export function TemplatePicker({ selectedKey, onSelect, onOpenChange }: TemplatePickerProps) {
  return (
    <div className="flex flex-col gap-6">
      <RadioGroup
        value={selectedKey ?? ''}
        aria-label="Program templates"
        onValueChange={onSelect}
        className="flex flex-col gap-6"
      >
        {LEVEL_ORDER.map((level) => {
          const templates = getTemplatesByLevel(level)
          if (templates.length === 0) return null
          return (
            <div key={level} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="eyebrow">{LEVEL_LABELS[level]}</h3>
                <Badge variant="outline" className="rounded-full px-2.5">
                  {templates.length} templates
                </Badge>
              </div>
              <div className="grid gap-3">
                {templates.map((template) => (
                  <TemplateCard key={template.key} template={template} />
                ))}
              </div>
            </div>
          )
        })}
      </RadioGroup>

      {/* Build Custom option */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="eyebrow">Build From Scratch</h3>
          <Badge variant="secondary">Custom</Badge>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Choose the load approach first, then build the days, exercises, and progression around it.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <ScratchBuilderLink
            href="/programs/builder?method=general"
            title="General Program"
            description="Start from flexible loading and add fixed-weight, bodyweight, effort-based, or other non-TM prescriptions as needed."
            icon={Hammer}
            onOpenChange={onOpenChange}
          />
          <ScratchBuilderLink
            href="/programs/builder?method=tm_driven"
            title="Training-Max Driven"
            description="Start from training-max context so percentages and next-block TM adjustments stay front and center where the method needs them."
            icon={Gauge}
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
}

function TemplateCard({ template }: TemplateCardProps) {
  const requiredLifts = template.required_exercises.map(formatExerciseKey).join(', ')
  const description = normalizeCadenceCopy(template.description)

  return (
    <Radio.Root
      value={template.key}
      nativeButton
      render={<button />}
      className="card-hover w-full rounded-[24px] border border-border/70 bg-card/70 p-5 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-checked:border-primary aria-checked:bg-primary/5 aria-checked:ring-1 aria-checked:ring-primary/30"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-medium tracking-[-0.04em] text-foreground">{template.name}</span>
          <Badge variant="outline" className="text-xs">
            {formatDaysPerWeek(template.days_per_week)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {formatWeekCycle(template.cycle_length_weeks)}
          </Badge>
          {template.variation_options && template.variation_options.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {template.variation_options.length} variation{template.variation_options.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        <p className="text-xs leading-5 text-muted-foreground">
          Lifts: {requiredLifts}
        </p>
      </div>
    </Radio.Root>
  )
}
