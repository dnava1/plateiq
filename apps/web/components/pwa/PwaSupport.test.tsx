import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PwaSupport } from './PwaSupport'

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

const iosSafariUserAgent = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)',
  'AppleWebKit/605.1.15 (KHTML, like Gecko)',
  'Version/17.5 Mobile/15E148 Safari/604.1',
].join(' ')

function mockBrowserShell() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  Object.defineProperty(window, 'requestAnimationFrame', {
    configurable: true,
    writable: true,
    value: vi.fn((callback: FrameRequestCallback) => {
      window.setTimeout(() => callback(0), 0)

      return 1
    }),
  })

  Object.defineProperty(window, 'cancelAnimationFrame', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  })
}

function mockIosSafari() {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: iosSafariUserAgent,
  })
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: 'iPhone',
  })
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    configurable: true,
    value: 5,
  })
}

describe('PwaSupport', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockBrowserShell()
    mockIosSafari()
  })

  afterEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('shows iOS Safari install instructions inline without the duplicate step row', async () => {
    render(<PwaSupport />)

    expect(await screen.findByText('Add PlateIQ to Home Screen')).toBeInTheDocument()
    expect(screen.getByLabelText('More')).toBeInTheDocument()
    expect(screen.getByText('Share')).toBeInTheDocument()
    expect(screen.getByText('Add to Home Screen')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/Open as Web App on, then tap Add/i)).toBeInTheDocument()
    })

    expect(screen.queryByText('More')).not.toBeInTheDocument()
  })
})
