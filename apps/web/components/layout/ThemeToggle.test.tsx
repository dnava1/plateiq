import { act } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeToggle } from './ThemeToggle'

const mocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
  state: {
    theme: 'system' as 'light' | 'dark' | 'system',
  },
}))

vi.mock('@/store/uiStore', () => ({
  useUiStore: (
    selector?: (state: {
      theme: 'light' | 'dark' | 'system'
      setTheme: typeof mocks.setTheme
    }) => unknown,
  ) => {
    const state = {
      theme: mocks.state.theme,
      setTheme: mocks.setTheme,
    }

    return typeof selector === 'function' ? selector(state) : state
  },
}))

function getHydrationWarnings(errorCalls: unknown[][]) {
  return errorCalls.filter((args) => args.some((arg) => {
    if (typeof arg !== 'string') {
      return false
    }

    return arg.includes('hydrated') || arg.includes('data-pressed')
  }))
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    mocks.state.theme = 'system'
    mocks.setTheme.mockReset()

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('hydrates without a toggle pressed-state mismatch when system theme resolves dark on the client', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const browserWindow = window

    vi.stubGlobal('window', undefined)
    const serverMarkup = renderToString(<ThemeToggle />)
    vi.stubGlobal('window', browserWindow)

    const container = document.createElement('div')
    container.innerHTML = serverMarkup
    document.body.appendChild(container)

    let root: Root | null = null

    await act(async () => {
      root = hydrateRoot(container, <ThemeToggle />)
    })

    await act(async () => {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve())
      })
    })

    expect(getHydrationWarnings(consoleError.mock.calls)).toHaveLength(0)
    expect(container.querySelector('[aria-label="Dark theme"]')).toHaveAttribute('data-pressed', '')
    expect(container.querySelector('[aria-label="Light theme"]')).not.toHaveAttribute('data-pressed')

    await act(async () => {
      root?.unmount()
    })
  })
})