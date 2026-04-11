'use client'

import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import Link from 'next/link'
import { getTemplatesByLevel } from '@/lib/constants/templates'
import type { ProgramTemplate } from '@/types/template'
import type { ProgramLevel } from '@/types/domain'
import { Badge } from '@/components/ui/badge'
import { Hammer } from 'lucide-react'

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
        <Link
          href="/programs/builder"
          onClick={() => onOpenChange?.(false)}
          className="card-hover w-full rounded-[24px] border border-dashed border-border/80 bg-card/70 p-5 text-left hover:border-primary/40 hover:bg-primary/5"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Hammer className="size-5 text-primary" data-icon="leading" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-base font-medium tracking-[-0.04em] text-foreground">Build a Program</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Set the days, exercises, and progression yourself
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}

interface TemplateCardProps {
  template: ProgramTemplate
}

function TemplateCard({ template }: TemplateCardProps) {
  return (
    <Radio.Root
      value={template.key}
      nativeButton
      render={<button />}
      className="card-hover w-full rounded-[24px] border border-border/70 bg-card/70 p-5 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-checked:border-primary aria-checked:bg-primary/5 aria-checked:ring-1 aria-checked:ring-primary/30"
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-medium tracking-[-0.04em] text-foreground">{template.name}</span>
            <Badge variant="outline" className="text-xs">
              {template.days_per_week}d/wk
            </Badge>
            <Badge variant="outline" className="text-xs">
              {template.cycle_length_weeks}wk cycle
            </Badge>
            {template.supplement_options && template.supplement_options.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {template.supplement_options.length} variation{template.supplement_options.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground line-clamp-2">{template.description}</p>
        </div>
        <Radio.Indicator className="mt-1 size-3 shrink-0 rounded-full bg-primary" />
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        Lifts: {template.required_exercises.join(', ')}
      </div>
    </Radio.Root>
  )
}
