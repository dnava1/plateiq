'use client'

import type { CSSProperties, ReactNode, RefObject } from 'react'
import { ViewportTooltipPortal, type TooltipCoordinate } from './ViewportTooltipPortal'

interface RenderTooltipArgs<TPayload> {
  label?: string | number
  maxWidth?: number
  payload: TPayload[]
}

interface RechartsViewportTooltipPortalProps<TPayload> extends RenderTooltipArgs<TPayload> {
  active?: boolean
  chartContainerRef: RefObject<HTMLElement | null>
  coordinate?: TooltipCoordinate
  offset?: number
  renderContent: (tooltip: RenderTooltipArgs<TPayload>) => ReactNode
}

export const HIDDEN_RECHARTS_TOOLTIP_WRAPPER_STYLE: CSSProperties = {
  pointerEvents: 'none',
  visibility: 'hidden',
  zIndex: 30,
}

export function RechartsViewportTooltipPortal<TPayload>({
  active,
  chartContainerRef,
  coordinate,
  label,
  offset = 12,
  payload,
  renderContent,
}: RechartsViewportTooltipPortalProps<TPayload>) {
  const hasRenderableTooltip = active === true
    && coordinate !== undefined
    && Number.isFinite(coordinate.x)
    && Number.isFinite(coordinate.y)
    && payload.length > 0

  return (
    <ViewportTooltipPortal
      active={hasRenderableTooltip}
      offset={offset}
      resolveAnchor={() => {
        if (!chartContainerRef.current || !coordinate) {
          return null
        }

        const chartRect = chartContainerRef.current.getBoundingClientRect()

        return {
          x: chartRect.left + coordinate.x,
          y: chartRect.top + coordinate.y,
        }
      }}
      resolveBoundaryElement={() => chartContainerRef.current}
      renderContent={({ maxWidth }) => renderContent({ label, maxWidth, payload })}
    />
  )
}
