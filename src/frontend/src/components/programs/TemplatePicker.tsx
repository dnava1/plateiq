'use client'

import { useRouter } from 'next/navigation'
import { getTemplatesByLevel } from '@/lib/constants/templates'
import type { ProgramTemplate } from '@/types/template'
import type { ProgramLevel } from '@/types/domain'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
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
  const router = useRouter()

  const handleCustom = () => {
    if (onOpenChange) onOpenChange(false)
    router.push('/programs/builder')
  }

  return (
    <div className="flex flex-col gap-6">
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
                <TemplateCard
                  key={template.key}
                  template={template}
                  isSelected={selectedKey === template.key}
                  onSelect={() => onSelect(template.key)}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Build Custom option */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="eyebrow">Custom</h3>
          <Badge variant="secondary">Builder</Badge>
        </div>
        <button
          type="button"
          onClick={handleCustom}
          className="w-full rounded-[24px] border border-dashed border-border/80 bg-card/70 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Hammer className="h-5 w-5 text-primary" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-base font-medium tracking-[-0.04em] text-foreground">Build Custom Program</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Design your own days, exercises, sets, and progression
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

interface TemplateCardProps {
  template: ProgramTemplate
  isSelected: boolean
  onSelect: () => void
}

function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-[24px] border border-border/70 bg-card/70 p-5 text-left transition-all card-hover',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
          : 'hover:bg-muted/50'
      )}
    >
      <div className="flex items-start justify-between gap-3">
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
                {template.supplement_options.length} supplement{template.supplement_options.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground line-clamp-2">{template.description}</p>
        </div>
        {isSelected && (
          <div className="mt-1 size-3 shrink-0 rounded-full bg-primary" />
        )}
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        Lifts: {template.required_exercises.join(', ')}
      </div>
    </button>
  )
}
