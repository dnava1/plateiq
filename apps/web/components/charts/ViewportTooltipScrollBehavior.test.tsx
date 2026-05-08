import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRef } from 'react'
import { ChartTooltipContent } from './ChartTooltipContent'
import { ConsistencyHeatmap } from './ConsistencyHeatmap'
import { resolveElementCenterTooltipAnchor, ViewportTooltipPortal } from './ViewportTooltipPortal'

vi.mock('@/hooks/usePreferredUnit', () => ({
  usePreferredUnit: () => 'lbs' as const,
}))

function assignRect(element: HTMLElement, getRect: () => Pick<DOMRect, 'bottom' | 'height' | 'left' | 'right' | 'top' | 'width'>) {
  element.getBoundingClientRect = () => ({
    ...getRect(),
    x: getRect().left,
    y: getRect().top,
    toJSON: getRect,
  } as DOMRect)
}

function TestViewportTooltip({ anchorTopRef }: { anchorTopRef: { current: number } }) {
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const boundaryRef = useRef<HTMLDivElement | null>(null)

  function handleBoundaryRef(element: HTMLDivElement | null) {
    boundaryRef.current = element

    if (element) {
      assignRect(element, () => ({
        bottom: 220,
        height: 220,
        left: 16,
        right: 360,
        top: 0,
        width: 344,
      }))
    }
  }

  function handleAnchorRef(element: HTMLDivElement | null) {
    anchorRef.current = element

    if (element) {
      assignRect(element, () => ({
        bottom: anchorTopRef.current + 20,
        height: 20,
        left: 40,
        right: 80,
        top: anchorTopRef.current,
        width: 40,
      }))
    }
  }

  return (
    <>
      <div ref={handleBoundaryRef}>Boundary</div>
      <div ref={handleAnchorRef}>Anchor</div>
      <ViewportTooltipPortal
        active
        resolveAnchor={() => resolveElementCenterTooltipAnchor(anchorRef.current)}
        resolveBoundaryElement={() => boundaryRef.current}
        renderContent={() => (
          <ChartTooltipContent label="Week of Apr 1" rows={[{ label: 'Sessions', value: '3' }]} />
        )}
      />
    </>
  )
}

function TestViewportTooltipWithScrollableBoundary({
  anchorTopRef,
  boundaryTopRef,
}: {
  anchorTopRef: { current: number }
  boundaryTopRef: { current: number }
}) {
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const boundaryRef = useRef<HTMLDivElement | null>(null)

  function handleBoundaryRef(element: HTMLDivElement | null) {
    boundaryRef.current = element

    if (element) {
      assignRect(element, () => ({
        bottom: boundaryTopRef.current + 120,
        height: 120,
        left: 16,
        right: 360,
        top: boundaryTopRef.current,
        width: 344,
      }))
    }
  }

  function handleAnchorRef(element: HTMLDivElement | null) {
    anchorRef.current = element

    if (element) {
      assignRect(element, () => ({
        bottom: anchorTopRef.current + 20,
        height: 20,
        left: 40,
        right: 80,
        top: anchorTopRef.current,
        width: 40,
      }))
    }
  }

  return (
    <>
      <div ref={handleBoundaryRef}>Boundary</div>
      <div ref={handleAnchorRef}>Anchor</div>
      <ViewportTooltipPortal
        active
        resolveAnchor={() => resolveElementCenterTooltipAnchor(anchorRef.current)}
        resolveBoundaryElement={() => boundaryRef.current}
        renderContent={() => (
          <ChartTooltipContent label="Week of Apr 1" rows={[{ label: 'Sessions', value: '3' }]} />
        )}
      />
    </>
  )
}

describe('chart tooltip scroll behavior', () => {
  it('keeps the consistency tooltip mounted when the viewport scrolls', async () => {
    render(
      <ConsistencyHeatmap
        data={[
          {
            isActive: true,
            totalSessions: 3,
            totalSets: 9,
            totalVolume: 1200,
            weekStart: '2026-04-01',
          },
        ]}
      />,
    )

    fireEvent.focus(screen.getByLabelText(/Week of /i))

    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    fireEvent.scroll(window)

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })
  })

  it('uses document positioning so page scroll keeps the portal attached in either direction', async () => {
    const anchorTopRef = { current: 120 }
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })

    render(<TestViewportTooltip anchorTopRef={anchorTopRef} />)

    const portal = screen.getByRole('tooltip').parentElement?.parentElement
    expect(portal).toHaveClass('absolute')
    expect(portal).toHaveStyle({ top: '108px' })

    anchorTopRef.current = 40
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 80 })
    fireEvent.scroll(window)

    await waitFor(() => {
      expect(portal).toHaveStyle({ top: '108px' })
    })

    anchorTopRef.current = 120
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    fireEvent.scroll(window)

    await waitFor(() => {
      expect(portal).toHaveStyle({ top: '108px' })
    })
  })

  it('hides the shared portal when the anchor leaves the visible chart area during scroll', async () => {
    const anchorTopRef = { current: 120 }
    const boundaryTopRef = { current: 80 }

    render(
      <TestViewportTooltipWithScrollableBoundary
        anchorTopRef={anchorTopRef}
        boundaryTopRef={boundaryTopRef}
      />,
    )

    const portal = screen.getByRole('tooltip').parentElement?.parentElement
    expect(portal).toHaveStyle({ visibility: 'visible' })

    boundaryTopRef.current = -40
    anchorTopRef.current = 0
    fireEvent.scroll(window)

    await waitFor(() => {
      expect(portal).toHaveStyle({ visibility: 'visible' })
    })

    boundaryTopRef.current = -100
    anchorTopRef.current = -60
    fireEvent.scroll(window)

    await waitFor(() => {
      expect(portal).toHaveStyle({ visibility: 'hidden' })
    })
  })
})
