import { describe, expect, it } from 'vitest'
import { calculateTooltipMaxWidth, calculateViewportTooltipPosition } from './ViewportTooltipPortal'

describe('calculateViewportTooltipPosition', () => {
  it('clamps tooltips inside the right edge of the viewport', () => {
    expect(
      calculateViewportTooltipPosition({
        anchorX: 390,
        anchorY: 240,
        tooltipHeight: 84,
        tooltipWidth: 176,
        viewportHeight: 844,
        viewportWidth: 393,
      }),
    ).toEqual({
      left: 289,
      placement: 'top',
      top: 228,
    })
  })

  it('falls back below the anchor when there is not enough room above', () => {
    expect(
      calculateViewportTooltipPosition({
        anchorX: 160,
        anchorY: 72,
        tooltipHeight: 96,
        tooltipWidth: 176,
        viewportHeight: 844,
        viewportWidth: 393,
      }),
    ).toEqual({
      left: 160,
      placement: 'bottom',
      top: 84,
    })
  })

  it('clamps tooltips inside a narrower chart boundary than the full viewport', () => {
    expect(
      calculateViewportTooltipPosition({
        anchorX: 320,
        anchorY: 300,
        boundaryBottom: 390,
        boundaryLeft: 16,
        boundaryRight: 359,
        boundaryTop: 160,
        tooltipHeight: 84,
        tooltipWidth: 176,
        viewportHeight: 844,
        viewportWidth: 390,
      }),
    ).toEqual({
      left: 263,
      placement: 'top',
      top: 288,
    })
  })

  it('caps tooltip width to the available card boundary instead of the full viewport', () => {
    expect(
      calculateTooltipMaxWidth({
        boundaryLeft: 16,
        boundaryRight: 140,
        viewportWidth: 390,
      }),
    ).toBe(108)
  })

  it('can clamp horizontally without forcing the tooltip inside a short chart row', () => {
    expect(
      calculateViewportTooltipPosition({
        anchorX: 320,
        anchorY: 300,
        boundaryLeft: 16,
        boundaryRight: 359,
        tooltipHeight: 84,
        tooltipWidth: 176,
        viewportHeight: 844,
        viewportWidth: 390,
      }),
    ).toEqual({
      left: 263,
      placement: 'top',
      top: 288,
    })
  })

  it('clamps against the visual viewport when it is shifted inside the layout viewport', () => {
    expect(
      calculateViewportTooltipPosition({
        anchorX: 20,
        anchorY: 140,
        tooltipHeight: 60,
        tooltipWidth: 100,
        viewportHeight: 600,
        viewportLeft: 24,
        viewportTop: 80,
        viewportWidth: 320,
      }),
    ).toEqual({
      left: 90,
      placement: 'bottom',
      top: 152,
    })
  })
})
