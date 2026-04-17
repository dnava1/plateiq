'use client'

import { useMemo } from 'react'
import { usePreferredWeightRounding } from '@/hooks/usePreferredWeightRounding'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { cn, formatWeight } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  buildWorkoutExecutionSnapshot,
  formatBlockRoleLabel,
  formatDurationClock,
  formatExecutionGroupTypeLabel,
  formatRepTarget,
  formatSetTypeLabel,
  getRecommendedRestSeconds,
  type WorkoutDisplayBlock,
  type WorkoutDisplaySet,
} from './types'

interface WorkoutPlanDisplayProps {
  sets: WorkoutDisplaySet[]
}

function getBlockCardClasses(role: WorkoutDisplayBlock['role']) {
  switch (role) {
    case 'primary':
      return 'border-primary/30 bg-primary/5'
    case 'variation':
      return 'border-sky-500/25 bg-sky-500/5'
    case 'accessory':
      return 'border-border/70 bg-background/55'
    default:
      return 'border-border/70 bg-background/55'
  }
}

function getExecutionGroupDescription(kind: 'superset' | 'circuit') {
  return kind === 'superset'
    ? 'Alternate between these blocks without losing your place.'
    : 'Work through these blocks as a circuit.'
}

export function WorkoutPlanDisplay({ sets }: WorkoutPlanDisplayProps) {
  const preferredUnit = usePreferredUnit()
  const weightRoundingLbs = usePreferredWeightRounding()
  const execution = useMemo(() => buildWorkoutExecutionSnapshot(sets), [sets])

  if (sets.length === 0) {
    return null
  }

  const renderBlock = (block: WorkoutDisplayBlock, nested = false) => (
    <Card key={block.blockId} className={cn('surface-panel', getBlockCardClasses(block.role), nested ? 'bg-background/70' : null)}>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{block.exerciseName}</CardTitle>
          <Badge variant={block.role === 'primary' ? 'secondary' : 'outline'}>{formatBlockRoleLabel(block.role)}</Badge>
          <Badge variant="outline">
            {block.totalCount} {block.totalCount === 1 ? 'set' : 'sets'}
          </Badge>
        </div>
        {block.notes ? <CardDescription>{block.notes}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        {block.sets.map((set, index) => {
          const recommendedRestSeconds = getRecommendedRestSeconds(set)

          return (
            <div key={set.set_order} className="rounded-2xl border border-border/70 bg-background/50 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Set {index + 1}</span>
                  <Badge variant={set.set_type === 'main' ? 'secondary' : set.is_amrap ? 'default' : 'outline'}>
                    {formatSetTypeLabel(set.set_type)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatWeight(set.weight_lbs, preferredUnit, weightRoundingLbs)} × {formatRepTarget(set.reps_prescribed, set.reps_prescribed_max, set.is_amrap)}
                </p>
              </div>
              {recommendedRestSeconds ? (
                <p className="mt-2 text-xs text-muted-foreground">Rest {formatDurationClock(recommendedRestSeconds)} after this set.</p>
              ) : null}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {execution.groups.map((group) =>
        group.kind === 'single'
          ? renderBlock(group.blocks[0]!)
          : (
              <Card key={group.id} className="surface-panel border-dashed border-border/80 bg-card/70 lg:col-span-2">
                <CardHeader className="gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{group.label}</CardTitle>
                    <Badge>{formatExecutionGroupTypeLabel(group.kind)}</Badge>
                    <Badge variant="outline">
                      {group.totalCount} {group.totalCount === 1 ? 'set' : 'sets'}
                    </Badge>
                  </div>
                  <CardDescription>{getExecutionGroupDescription(group.kind)}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 pt-0 lg:grid-cols-2">
                  {group.blocks.map((block) => renderBlock(block, true))}
                </CardContent>
              </Card>
            ),
      )}
    </div>
  )
}