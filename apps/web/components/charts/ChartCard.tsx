'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface ChartCardProps {
  children?: ReactNode
  className?: string
  description?: string
  emptyMessage: string
  emptyStateNote?: string
  headerBadge?: ReactNode
  heightClassName?: string
  isEmpty?: boolean
  isLoading?: boolean
  title: string
}

export function ChartCard({
  children,
  className,
  description,
  emptyMessage,
  emptyStateNote,
  headerBadge,
  heightClassName = 'h-64',
  isEmpty,
  isLoading,
  title,
}: ChartCardProps) {
  return (
    <Card className={cn('surface-panel overflow-visible', className)}>
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {headerBadge ? <div className="shrink-0">{headerBadge}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className={cn('flex flex-col gap-3', heightClassName)}>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-full w-full rounded-[22px]" />
          </div>
        ) : isEmpty ? (
          <div className={cn('flex items-center justify-center rounded-[22px] border border-border/70 bg-background/45 px-4 text-center text-sm text-muted-foreground', heightClassName)}>
            <div className="flex flex-col gap-2">
              <p>{emptyMessage}</p>
              {emptyStateNote ? <p className="text-xs text-muted-foreground">{emptyStateNote}</p> : null}
            </div>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
