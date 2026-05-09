import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MobileShellHeaderController } from './MobileShellHeaderController'

const mocks = vi.hoisted(() => ({
  pathname: '/dashboard',
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}))

let nextFrameId = 1
let frameCallbacks = new Map<number, FrameRequestCallback>()

function setScrollTop(element: HTMLElement, value: number) {
  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    value,
  })
}

function flushAnimationFrame() {
  const callbacks = Array.from(frameCallbacks.values())
  frameCallbacks.clear()

  act(() => {
    callbacks.forEach((callback) => callback(0))
  })
}

function renderShell() {
  return render(
    <div data-authenticated-shell="true">
      <div data-app-scroll-region="true">
        <div data-app-header-slot="true">
          <header data-app-chrome="header">Header</header>
        </div>
        <main>Dashboard content</main>
      </div>
      <MobileShellHeaderController />
    </div>,
  )
}

describe('MobileShellHeaderController', () => {
  beforeEach(() => {
    nextFrameId = 1
    frameCallbacks = new Map()

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      const frameId = nextFrameId
      nextFrameId += 1
      frameCallbacks.set(frameId, callback)
      return frameId
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((frameId: number) => {
      frameCallbacks.delete(frameId)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    frameCallbacks.clear()
  })

  it('keeps normal scroll attached to the page and counter-moves top rubber-band pulls', () => {
    const { container } = renderShell()
    const shell = container.querySelector('[data-authenticated-shell="true"]') as HTMLElement
    const scrollRegion = container.querySelector('[data-app-scroll-region="true"]') as HTMLElement

    expect(shell.style.getPropertyValue('--authenticated-header-pull-offset')).toBe('0px')

    setScrollTop(scrollRegion, 48)
    fireEvent.scroll(scrollRegion)
    flushAnimationFrame()
    expect(shell.style.getPropertyValue('--authenticated-header-pull-offset')).toBe('0px')

    setScrollTop(scrollRegion, 0)
    fireEvent.scroll(scrollRegion)
    flushAnimationFrame()
    expect(shell.style.getPropertyValue('--authenticated-header-pull-offset')).toBe('0px')

    setScrollTop(scrollRegion, -32)
    fireEvent.scroll(scrollRegion)
    flushAnimationFrame()
    expect(shell.style.getPropertyValue('--authenticated-header-pull-offset')).toBe('32px')
  })
})
