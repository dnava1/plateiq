const OFFLINE_LAUNCH_READY_KEY = 'plateiq-pwa-offline-launch-ready'
const REGISTER_TIMEOUT_MS = 8_000
const PREPARE_TIMEOUT_MS = 8_000

type PrepareOfflineLaunchResponse =
  | {
    cacheVersion: string
    ok: true
    type: 'OFFLINE_LAUNCH_READY'
  }
  | {
    message?: string
    ok: false
    type: 'OFFLINE_LAUNCH_ERROR'
  }

function waitForServiceWorkerReady(timeoutMs = REGISTER_TIMEOUT_MS) {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('Timed out waiting for the service worker to become ready.')), timeoutMs)
    }),
  ])
}

function postMessageToWorker<TResponse>(
  worker: ServiceWorker,
  message: Record<string, unknown>,
  timeoutMs = PREPARE_TIMEOUT_MS,
) {
  return new Promise<TResponse>((resolve, reject) => {
    const channel = new MessageChannel()
    const timeoutId = window.setTimeout(() => {
      reject(new Error('Timed out waiting for the service worker response.'))
    }, timeoutMs)

    channel.port1.onmessage = (event) => {
      window.clearTimeout(timeoutId)
      resolve(event.data as TResponse)
    }

    worker.postMessage(message, [channel.port2])
  })
}

export function getOfflineLaunchReadyVersion() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(OFFLINE_LAUNCH_READY_KEY)
}

export function clearOfflineLaunchReadyVersion() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(OFFLINE_LAUNCH_READY_KEY)
}

export function markOfflineLaunchReadyVersion(cacheVersion: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(OFFLINE_LAUNCH_READY_KEY, cacheVersion)
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return null
  }

  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
    updateViaCache: 'none',
  })

  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  registration.addEventListener('updatefound', () => {
    const nextWorker = registration.installing

    if (!nextWorker) {
      return
    }

    nextWorker.addEventListener('statechange', () => {
      if (nextWorker.state === 'installed' && navigator.serviceWorker.controller) {
        nextWorker.postMessage({ type: 'SKIP_WAITING' })
      }
    })
  })

  return registration
}

export async function prepareOfflineLaunch(registration?: ServiceWorkerRegistration | null) {
  if (!('serviceWorker' in navigator)) {
    return null
  }

  const readyRegistration = registration ?? await waitForServiceWorkerReady()
  const activeWorker = readyRegistration.active

  if (!activeWorker) {
    throw new Error('No active service worker was available to prepare offline launch.')
  }

  const response = await postMessageToWorker<PrepareOfflineLaunchResponse>(
    activeWorker,
    { type: 'PREPARE_OFFLINE_LAUNCH' },
  )

  if (!response || !response.ok) {
    throw new Error(response?.message ?? 'The service worker did not confirm offline launch readiness.')
  }

  return response.cacheVersion
}

export async function unregisterServiceWorkers() {
  if (!('serviceWorker' in navigator)) {
    return
  }

  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map((registration) => registration.unregister()))
  clearOfflineLaunchReadyVersion()
}

export async function requestPersistentStorage() {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    await navigator.storage.persist().catch(() => undefined)
  }
}