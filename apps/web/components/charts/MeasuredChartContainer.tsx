'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

interface ChartDimensions {
  height: number
  width: number
}

const TEST_CHART_DIMENSIONS: ChartDimensions = { width: 640, height: 288 }

interface MeasuredChartContainerProps {
  children: (dimensions: ChartDimensions) => ReactNode
  className: string
}

export function MeasuredChartContainer({ children, className }: MeasuredChartContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [dimensions, setDimensions] = useState<ChartDimensions | null>(null)

  useEffect(() => {
    const container = containerRef.current
    let frameId: number | null = null

    if (!container) {
      return
    }

    const updateReadyState = () => {
      const { width, height } = container.getBoundingClientRect()

      if (width > 0 && height > 0) {
        if (frameId !== null) {
          cancelAnimationFrame(frameId)
        }

        frameId = requestAnimationFrame(() => {
          setDimensions({ width, height })
        })
        return
      }

      if (process.env.NODE_ENV === 'test') {
        setDimensions(TEST_CHART_DIMENSIONS)
        return
      }

      setDimensions(null)
    }

    updateReadyState()

    if (typeof ResizeObserver === 'undefined') {
      updateReadyState()
      return
    }

    const resizeObserver = new ResizeObserver(() => {
      updateReadyState()
    })

    resizeObserver.observe(container)

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }

      resizeObserver.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef} className={`min-w-0 overflow-hidden ${className}`}>
      {dimensions ? children(dimensions) : null}
    </div>
  )
}