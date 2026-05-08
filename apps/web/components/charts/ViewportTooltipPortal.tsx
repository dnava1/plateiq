'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useViewportChangeEffect } from './useViewportChangeEffect'

export interface TooltipCoordinate {
  x: number
  y: number
}

export interface ViewportTooltipAnchor extends TooltipCoordinate {
  offset?: number
}

type TooltipPlacement = 'bottom' | 'top'

const TOOLTIP_BOUNDARY_PADDING = 8

interface ViewportTooltipPositionOptions {
  anchorX: number
  anchorY: number
  boundaryBottom?: number
  boundaryLeft?: number
  boundaryRight?: number
  boundaryTop?: number
  offset?: number
  padding?: number
  tooltipHeight: number
  tooltipWidth: number
  viewportHeight: number
  viewportLeft?: number
  viewportTop?: number
  viewportWidth: number
}

interface ViewportTooltipPosition {
  left: number
  placement: TooltipPlacement
  top: number
}

interface ViewportTooltipPortalProps {
  active?: boolean
  boundaryAxis?: 'both' | 'horizontal'
  offset?: number
  renderContent: (tooltip: { maxWidth?: number }) => ReactNode
  resolveAnchor: () => ViewportTooltipAnchor | null
  resolveBoundaryElement?: () => HTMLElement | null
}

function isFiniteCoordinate(anchor: ViewportTooltipAnchor | null): anchor is ViewportTooltipAnchor {
  return anchor !== null && Number.isFinite(anchor.x) && Number.isFinite(anchor.y)
}

function getHorizontalTooltipBounds({
  boundaryLeft,
  boundaryRight,
  padding = TOOLTIP_BOUNDARY_PADDING,
  viewportLeft = 0,
  viewportWidth,
}: Pick<ViewportTooltipPositionOptions, 'boundaryLeft' | 'boundaryRight' | 'padding' | 'viewportLeft' | 'viewportWidth'>) {
  const viewportRight = viewportLeft + viewportWidth
  const leftBoundary = Math.max(viewportLeft + padding, boundaryLeft ?? viewportLeft)
  const rightBoundary = Math.min(viewportRight - padding, boundaryRight ?? viewportRight)

  return {
    availableWidth: Math.max(rightBoundary - leftBoundary, 0),
    leftBoundary,
    rightBoundary,
  }
}

function getVerticalTooltipBounds({
  boundaryBottom,
  boundaryTop,
  padding = TOOLTIP_BOUNDARY_PADDING,
  viewportTop = 0,
  viewportHeight,
}: Pick<ViewportTooltipPositionOptions, 'boundaryBottom' | 'boundaryTop' | 'padding' | 'viewportHeight' | 'viewportTop'>) {
  const viewportBottom = viewportTop + viewportHeight
  const topBoundary = Math.max(viewportTop + padding, boundaryTop ?? viewportTop)
  const bottomBoundary = Math.min(viewportBottom - padding, boundaryBottom ?? viewportBottom)

  return {
    bottomBoundary,
    topBoundary,
  }
}

function intersectBoundaryRects(
  current: DOMRect,
  next: DOMRect,
): Pick<DOMRect, 'bottom' | 'left' | 'right' | 'top'> {
  return {
    bottom: Math.min(current.bottom, next.bottom),
    left: Math.max(current.left, next.left),
    right: Math.min(current.right, next.right),
    top: Math.max(current.top, next.top),
  }
}

function getTooltipBoundaryRect(element: HTMLElement) {
  let boundary = element.getBoundingClientRect()
  const card = element.closest('[data-slot="card"]')

  if (card instanceof HTMLElement) {
    boundary = {
      ...boundary,
      ...intersectBoundaryRects(boundary, card.getBoundingClientRect()),
    }
  }

  let current = element.parentElement

  while (current) {
    const styles = window.getComputedStyle(current)
    if (styles.overflowX !== 'visible' || styles.overflowY !== 'visible') {
      boundary = {
        ...boundary,
        ...intersectBoundaryRects(boundary, current.getBoundingClientRect()),
      }
      break
    }

    current = current.parentElement
  }

  return boundary
}

export function calculateTooltipMaxWidth({
  boundaryLeft,
  boundaryRight,
  padding = TOOLTIP_BOUNDARY_PADDING,
  viewportLeft,
  viewportWidth,
}: Pick<ViewportTooltipPositionOptions, 'boundaryLeft' | 'boundaryRight' | 'padding' | 'viewportLeft' | 'viewportWidth'>) {
  const { availableWidth } = getHorizontalTooltipBounds({
    boundaryLeft,
    boundaryRight,
    padding,
    viewportLeft,
    viewportWidth,
  })

  return Math.max(availableWidth - padding * 2, 1)
}

export function calculateViewportTooltipPosition({
  anchorX,
  anchorY,
  boundaryBottom,
  boundaryLeft,
  boundaryRight,
  boundaryTop,
  offset = 12,
  padding = 8,
  tooltipHeight,
  tooltipWidth,
  viewportHeight,
  viewportLeft,
  viewportTop,
  viewportWidth,
}: ViewportTooltipPositionOptions): ViewportTooltipPosition {
  const { availableWidth, leftBoundary, rightBoundary } = getHorizontalTooltipBounds({
    boundaryLeft,
    boundaryRight,
    padding,
    viewportLeft,
    viewportWidth,
  })
  const { bottomBoundary, topBoundary } = getVerticalTooltipBounds({
    boundaryBottom,
    boundaryTop,
    padding,
    viewportHeight,
    viewportTop,
  })

  const left = tooltipWidth + padding * 2 >= availableWidth
    ? (leftBoundary + rightBoundary) / 2
    : Math.min(
        Math.max(anchorX, leftBoundary + tooltipWidth / 2 + padding),
        rightBoundary - tooltipWidth / 2 - padding,
      )

  const aboveAnchor = anchorY - offset
  const belowAnchor = anchorY + offset
  const canPlaceAbove = aboveAnchor - tooltipHeight >= topBoundary
  const canPlaceBelow = belowAnchor + tooltipHeight <= bottomBoundary

  if (canPlaceAbove || !canPlaceBelow) {
    return {
      left,
      placement: 'top',
      top: Math.min(
        Math.max(aboveAnchor, topBoundary + tooltipHeight),
        bottomBoundary,
      ),
    }
  }

  return {
    left,
    placement: 'bottom',
    top: Math.max(
      Math.min(belowAnchor, bottomBoundary - tooltipHeight),
      topBoundary,
    ),
  }
}

export function resolveElementCenterTooltipAnchor(element: HTMLElement | null, offset = 12): ViewportTooltipAnchor | null {
  if (!element || typeof document === 'undefined' || !document.body.contains(element)) {
    return null
  }

  const rect = element.getBoundingClientRect()

  return {
    offset: rect.height / 2 + offset,
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }
}

function getCurrentViewportRect() {
  const visualViewport = window.visualViewport

  return {
    height: visualViewport?.height ?? window.innerHeight,
    left: visualViewport?.offsetLeft ?? 0,
    top: visualViewport?.offsetTop ?? 0,
    width: visualViewport?.width ?? window.innerWidth,
  }
}

export function ViewportTooltipPortal({
  active,
  boundaryAxis = 'both',
  offset = 12,
  renderContent,
  resolveAnchor,
  resolveBoundaryElement,
}: ViewportTooltipPortalProps) {
  const portalRef = useRef<HTMLDivElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const hasRenderableTooltip = active === true

  function positionTooltip() {
    const anchor = hasRenderableTooltip ? resolveAnchor() : null
    const portal = portalRef.current
    const tooltip = tooltipRef.current

    if (!portal || !tooltip || !hasRenderableTooltip || !isFiniteCoordinate(anchor)) {
      if (portal) {
        portal.style.visibility = 'hidden'
      }
      return
    }

    const boundaryElement = resolveBoundaryElement?.()
    const boundaryRect = boundaryElement ? getTooltipBoundaryRect(boundaryElement) : undefined
    const viewportRect = getCurrentViewportRect()
    const maxWidth = calculateTooltipMaxWidth({
      boundaryLeft: boundaryRect?.left,
      boundaryRight: boundaryRect?.right,
      padding: TOOLTIP_BOUNDARY_PADDING,
      viewportLeft: viewportRect.left,
      viewportWidth: viewportRect.width,
    })

    portal.style.setProperty('--chart-tooltip-max-width', `${maxWidth}px`)
    portal.style.setProperty('--chart-tooltip-min-width', `${Math.min(176, maxWidth)}px`)

    const tooltipRect = tooltip.getBoundingClientRect()
    const position = calculateViewportTooltipPosition({
      anchorX: anchor.x,
      anchorY: anchor.y,
      boundaryBottom: boundaryAxis === 'both' ? boundaryRect?.bottom : undefined,
      boundaryLeft: boundaryRect?.left,
      boundaryRight: boundaryRect?.right,
      boundaryTop: boundaryAxis === 'both' ? boundaryRect?.top : undefined,
      offset: anchor.offset ?? offset,
      padding: TOOLTIP_BOUNDARY_PADDING,
      tooltipHeight: tooltipRect.height,
      tooltipWidth: tooltipRect.width,
      viewportHeight: viewportRect.height,
      viewportLeft: viewportRect.left,
      viewportTop: viewportRect.top,
      viewportWidth: viewportRect.width,
    })

    portal.style.left = `${position.left + window.scrollX}px`
    portal.style.top = `${position.top + window.scrollY}px`
    portal.style.transform = position.placement === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)'
    portal.style.visibility = 'visible'
  }

  useViewportChangeEffect(hasRenderableTooltip, positionTooltip)

  useLayoutEffect(() => {
    positionTooltip()
  })

  if (!hasRenderableTooltip || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div ref={portalRef} className="pointer-events-none absolute z-50" style={{ left: 0, top: 0, visibility: 'hidden' }}>
      <div ref={tooltipRef}>{renderContent({})}</div>
    </div>,
    document.body,
  )
}
