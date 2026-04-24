'use client'

import { useEffect, useRef, useState, type ReactNode, type UIEventHandler } from 'react'
import { cn } from '@/lib/utils'

interface ScrollableChartFrameProps {
  children: ReactNode
  className?: string
  minWidth: number
  onScroll?: UIEventHandler<HTMLDivElement>
  scrollKey: string | number
}

export function ScrollableChartFrame({
  children,
  className,
  minWidth,
  onScroll,
  scrollKey,
}: ScrollableChartFrameProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [hasOverflow, setHasOverflow] = useState(false)

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    const content = contentRef.current
    let frameId: number | null = null

    if (!scrollContainer || !content) {
      return
    }

    const updateOverflowState = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }

      frameId = requestAnimationFrame(() => {
        const nextHasOverflow = scrollContainer.scrollWidth > scrollContainer.clientWidth + 1
        setHasOverflow((current) => (current === nextHasOverflow ? current : nextHasOverflow))
      })
    }

    updateOverflowState()

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        if (frameId !== null) {
          cancelAnimationFrame(frameId)
        }
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      updateOverflowState()
    })

    resizeObserver.observe(scrollContainer)
    resizeObserver.observe(content)

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }

      resizeObserver.disconnect()
    }
  }, [minWidth, scrollKey])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current

    if (!scrollContainer || !hasOverflow) {
      return
    }

    scrollContainer.scrollLeft = scrollContainer.scrollWidth
  }, [hasOverflow, minWidth, scrollKey])

  return (
    <div
      ref={scrollContainerRef}
      className={cn(
        'max-w-full min-w-0 overscroll-x-contain pb-2 touch-pan-x',
        hasOverflow ? 'overflow-x-auto' : 'overflow-x-hidden',
        className,
      )}
      onScroll={onScroll}
      tabIndex={0}
    >
      <div ref={contentRef} style={{ minWidth, width: '100%' }}>
        {children}
      </div>
    </div>
  )
}
