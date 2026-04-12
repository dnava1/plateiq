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
  heightClassName = 'h-64',
  isEmpty,
  isLoading,
  title,
}: ChartCardProps) {
  return (
    <Card className={cn('surface-panel', className)}>
      <CardHeader className="gap-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className={cn('flex flex-col gap-3', heightClassName)}>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-full w-full rounded-[22px]" />
          </div>
        ) : isEmpty ? (
          <div className={cn('flex items-center justify-center rounded-[22px] border border-border/70 bg-background/45 px-4 text-center text-sm text-muted-foreground', heightClassName)}>
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
