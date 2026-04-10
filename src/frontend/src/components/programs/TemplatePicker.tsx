'use client'

import { getTemplatesByLevel } from '@/lib/constants/templates'
import type { ProgramTemplate } from '@/types/template'
import type { ProgramLevel } from '@/types/domain'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const LEVEL_LABELS: Record<ProgramLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

const LEVEL_ORDER: ProgramLevel[] = ['beginner', 'intermediate', 'advanced']

interface TemplatePickerProps {
  selectedKey: string | null
  onSelect: (key: string) => void
}

export function TemplatePicker({ selectedKey, onSelect }: TemplatePickerProps) {
  return (
    <div className="space-y-6">
      {LEVEL_ORDER.map((level) => {
        const templates = getTemplatesByLevel(level)
        if (templates.length === 0) return null
        return (
          <div key={level}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {LEVEL_LABELS[level]}
            </h3>
            <div className="grid gap-2">
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
        'w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50',
        isSelected && 'border-foreground bg-muted'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{template.name}</span>
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
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{template.description}</p>
        </div>
        {isSelected && (
          <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-foreground" />
        )}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Lifts: {template.required_exercises.join(', ')}
      </div>
    </button>
  )
}
