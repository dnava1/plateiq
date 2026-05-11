import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearOfflineLaunchReadyVersion,
  getOfflineLaunchReadyVersion,
  markOfflineLaunchReadyVersion,
  prepareOfflineLaunch,
  unregisterServiceWorkers,
} from './service-worker'

describe('pwa service-worker helpers', () => {
  beforeEach(() => {
    window.localStorage.clear()

    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistrations: vi.fn().mockResolvedValue([]),
        ready: Promise.resolve(null),
      },
    })
  })

  it('returns the prepared cache version after the active worker confirms offline readiness', async () => {
    const postMessage = vi.fn((_message: unknown, ports?: MessagePort[]) => {
      ports?.[0]?.postMessage({
        cacheVersion: 'plateiq-shell-v8',
        ok: true,
        type: 'OFFLINE_LAUNCH_READY',
      })
    })

    await expect(prepareOfflineLaunch({
      active: {
        postMessage,
      },
    } as unknown as ServiceWorkerRegistration)).resolves.toBe('plateiq-shell-v8')

    expect(getOfflineLaunchReadyVersion()).toBeNull()
  })

  it('clears the readiness marker when unregistering service workers', async () => {
    window.localStorage.setItem('plateiq-pwa-offline-launch-ready', 'plateiq-shell-v8')

    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistrations: vi.fn().mockResolvedValue([
          {
            unregister: vi.fn().mockResolvedValue(true),
          },
        ]),
      },
    })

    await unregisterServiceWorkers()

    expect(getOfflineLaunchReadyVersion()).toBeNull()
  })

  it('can clear the readiness marker directly', () => {
    window.localStorage.setItem('plateiq-pwa-offline-launch-ready', 'plateiq-shell-v8')

    clearOfflineLaunchReadyVersion()

    expect(getOfflineLaunchReadyVersion()).toBeNull()
  })

  it('can mark the readiness marker directly', () => {
    markOfflineLaunchReadyVersion('plateiq-shell-v8')

    expect(getOfflineLaunchReadyVersion()).toBe('plateiq-shell-v8')
  })
})