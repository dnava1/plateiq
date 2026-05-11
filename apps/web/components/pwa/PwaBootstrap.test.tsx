import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PwaBootstrap } from './PwaBootstrap'

const mocks = vi.hoisted(() => ({
  clearOfflineLaunchReadyVersion: vi.fn(),
  markOfflineLaunchReadyVersion: vi.fn(),
  prepareOfflineLaunch: vi.fn().mockResolvedValue('plateiq-shell-v8'),
  registerServiceWorker: vi.fn().mockResolvedValue({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
  requestPersistentStorage: vi.fn().mockResolvedValue(undefined),
  unregisterServiceWorkers: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/pwa/service-worker', () => ({
  clearOfflineLaunchReadyVersion: () => mocks.clearOfflineLaunchReadyVersion(),
  markOfflineLaunchReadyVersion: (cacheVersion: string) => mocks.markOfflineLaunchReadyVersion(cacheVersion),
  prepareOfflineLaunch: (registration: ServiceWorkerRegistration | null) => mocks.prepareOfflineLaunch(registration),
  registerServiceWorker: () => mocks.registerServiceWorker(),
  requestPersistentStorage: () => mocks.requestPersistentStorage(),
  unregisterServiceWorkers: () => mocks.unregisterServiceWorkers(),
}))

describe('PwaBootstrap', () => {
  beforeEach(() => {
    mocks.clearOfflineLaunchReadyVersion.mockClear()
    mocks.markOfflineLaunchReadyVersion.mockClear()
    mocks.prepareOfflineLaunch.mockClear()
    mocks.prepareOfflineLaunch.mockResolvedValue('plateiq-shell-v8')
    mocks.registerServiceWorker.mockClear()
    mocks.requestPersistentStorage.mockClear()
    mocks.unregisterServiceWorkers.mockClear()
    vi.stubEnv('NODE_ENV', 'production')

    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    })
  })

  it('registers and prepares the offline launch shell immediately in production', async () => {
    render(<PwaBootstrap />)

    await waitFor(() => {
      expect(mocks.registerServiceWorker).toHaveBeenCalledTimes(1)
    })

    expect(mocks.requestPersistentStorage).toHaveBeenCalledTimes(1)
    expect(mocks.prepareOfflineLaunch).toHaveBeenCalledTimes(1)
    expect(mocks.markOfflineLaunchReadyVersion).toHaveBeenCalledWith('plateiq-shell-v8')
    expect(mocks.unregisterServiceWorkers).not.toHaveBeenCalled()
  })

  it('ignores stale prepare failures after a later retry succeeds', async () => {
    let resolveFirstPrepare: ((value: string) => void) | null = null
    let rejectFirstPrepare: ((reason?: unknown) => void) | null = null
    let controllerChangeHandler: (() => void) | null = null

    mocks.prepareOfflineLaunch
      .mockImplementationOnce(() => new Promise<string>((resolve, reject) => {
        resolveFirstPrepare = resolve
        rejectFirstPrepare = reject
      }))
      .mockResolvedValueOnce('plateiq-shell-v8')

    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: {
        addEventListener: vi.fn((eventName: string, handler: () => void) => {
          if (eventName === 'controllerchange') {
            controllerChangeHandler = handler
          }
        }),
        removeEventListener: vi.fn(),
      },
    })

    render(<PwaBootstrap />)

    await waitFor(() => {
      expect(mocks.prepareOfflineLaunch).toHaveBeenCalledTimes(1)
    })

    const triggerControllerChange = controllerChangeHandler as (() => void) | null

    if (triggerControllerChange) {
      triggerControllerChange()
    }

    await waitFor(() => {
      expect(mocks.prepareOfflineLaunch).toHaveBeenCalledTimes(2)
    })

    await waitFor(() => {
      expect(mocks.markOfflineLaunchReadyVersion).toHaveBeenCalledWith('plateiq-shell-v8')
    })

    expect(mocks.clearOfflineLaunchReadyVersion).toHaveBeenCalledTimes(1)
    mocks.clearOfflineLaunchReadyVersion.mockClear()

    const rejectStalePrepare = rejectFirstPrepare as ((reason?: unknown) => void) | null
    const resolveStalePrepare = resolveFirstPrepare as ((value: string) => void) | null

    if (rejectStalePrepare) {
      rejectStalePrepare(new Error('stale prepare timeout'))
    }

    if (resolveStalePrepare) {
      resolveStalePrepare('plateiq-shell-v8')
    }

    await Promise.resolve()

    expect(mocks.clearOfflineLaunchReadyVersion).not.toHaveBeenCalled()
  })

  it('ignores in-flight prepare results after updatefound invalidates readiness', async () => {
    let resolvePrepare: ((value: string) => void) | null = null
    let updateFoundHandler: (() => void) | null = null

    const registration = {
      addEventListener: vi.fn((eventName: string, handler: () => void) => {
        if (eventName === 'updatefound') {
          updateFoundHandler = handler
        }
      }),
      removeEventListener: vi.fn(),
    }

    mocks.registerServiceWorker.mockResolvedValueOnce(registration)
    mocks.prepareOfflineLaunch.mockImplementationOnce(() => new Promise<string>((resolve) => {
      resolvePrepare = resolve
    }))

    render(<PwaBootstrap />)

    await waitFor(() => {
      expect(mocks.prepareOfflineLaunch).toHaveBeenCalledTimes(1)
    })

    const triggerUpdateFound = updateFoundHandler as (() => void) | null

    if (triggerUpdateFound) {
      triggerUpdateFound()
    }

    expect(mocks.clearOfflineLaunchReadyVersion).toHaveBeenCalledTimes(1)

    const resolveStalePrepare = resolvePrepare as ((value: string) => void) | null

    if (resolveStalePrepare) {
      resolveStalePrepare('plateiq-shell-v8')
    }

    await Promise.resolve()

    expect(mocks.markOfflineLaunchReadyVersion).not.toHaveBeenCalled()
  })

  it('unregisters service workers outside production', async () => {
    vi.stubEnv('NODE_ENV', 'development')

    render(<PwaBootstrap />)

    await waitFor(() => {
      expect(mocks.unregisterServiceWorkers).toHaveBeenCalledTimes(1)
    })

    expect(mocks.registerServiceWorker).not.toHaveBeenCalled()
    expect(mocks.prepareOfflineLaunch).not.toHaveBeenCalled()
  })
})