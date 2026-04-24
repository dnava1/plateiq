import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ScrollableChartFrame } from './ScrollableChartFrame'

type ResizeObserverCallbackType = ConstructorParameters<typeof ResizeObserver>[0]

class MockResizeObserver {
  callback: ResizeObserverCallbackType

  constructor(callback: ResizeObserverCallbackType) {
    this.callback = callback
    mockResizeObservers.push(this)
  }

  disconnect() {}

  observe() {}

  unobserve() {}

  trigger() {
    this.callback([], this as unknown as ResizeObserver)
  }
}

const mockResizeObservers: MockResizeObserver[] = []

describe('ScrollableChartFrame', () => {
  beforeEach(() => {
    mockResizeObservers.length = 0

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('hides the horizontal scrollbar when content fits the frame', async () => {
    const { container } = render(
      <ScrollableChartFrame minWidth={320} scrollKey="fit">
        <div>chart</div>
      </ScrollableChartFrame>,
    )

    const frame = container.querySelector('[tabindex="0"]') as HTMLDivElement

    Object.defineProperty(frame, 'clientWidth', { configurable: true, value: 400 })
    Object.defineProperty(frame, 'scrollWidth', { configurable: true, value: 400 })

    act(() => {
      mockResizeObservers.forEach((observer) => observer.trigger())
    })

    await waitFor(() => {
      expect(frame).toHaveClass('overflow-x-hidden')
    })

    expect(frame).not.toHaveClass('overflow-x-auto')
  })

  it('shows the horizontal scrollbar only when the content actually overflows', async () => {
    const { container } = render(
      <ScrollableChartFrame minWidth={320} scrollKey="overflow">
        <div>chart</div>
      </ScrollableChartFrame>,
    )

    const frame = container.querySelector('[tabindex="0"]') as HTMLDivElement

    Object.defineProperty(frame, 'clientWidth', { configurable: true, value: 320 })
    Object.defineProperty(frame, 'scrollWidth', { configurable: true, value: 520 })
    Object.defineProperty(frame, 'scrollLeft', { configurable: true, writable: true, value: 0 })

    act(() => {
      mockResizeObservers.forEach((observer) => observer.trigger())
    })

    await waitFor(() => {
      expect(frame).toHaveClass('overflow-x-auto')
    })

    expect(frame.scrollLeft).toBe(520)
  })
})
