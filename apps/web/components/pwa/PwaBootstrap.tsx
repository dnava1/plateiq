'use client'

import { useEffect } from 'react'
import {
  clearOfflineLaunchReadyVersion,
  markOfflineLaunchReadyVersion,
  prepareOfflineLaunch,
  registerServiceWorker,
  requestPersistentStorage,
  unregisterServiceWorkers,
} from '@/lib/pwa/service-worker'

export function PwaBootstrap() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      void unregisterServiceWorkers().catch(() => undefined)
      return
    }

    if (!('serviceWorker' in navigator)) {
      return
    }

    let isActive = true
    let activeRegistration: ServiceWorkerRegistration | null = null
    let latestPrepareAttemptId = 0

    const clearOfflineReadiness = () => {
      if (isActive) {
        clearOfflineLaunchReadyVersion()
      }
    }

    const invalidateOfflineReadiness = () => {
      latestPrepareAttemptId += 1
      clearOfflineReadiness()
    }

    const prepare = async () => {
      const attemptId = ++latestPrepareAttemptId

      try {
        const registration = activeRegistration ?? await registerServiceWorker()

        if (!isActive || !registration) {
          return
        }

        if (activeRegistration !== registration) {
          activeRegistration?.removeEventListener('updatefound', invalidateOfflineReadiness)
          registration.addEventListener('updatefound', invalidateOfflineReadiness)
        }

        activeRegistration = registration
        const cacheVersion = await prepareOfflineLaunch(registration)

        if (isActive && attemptId === latestPrepareAttemptId && cacheVersion) {
          markOfflineLaunchReadyVersion(cacheVersion)
        }
      } catch {
        if (attemptId === latestPrepareAttemptId) {
          clearOfflineReadiness()
        }
      }
    }

    const handleControllerChange = () => {
      invalidateOfflineReadiness()
      void prepare()
    }

    const handleOnline = () => {
      void prepare()
    }

    void requestPersistentStorage()
    void prepare()

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    window.addEventListener('online', handleOnline)

    return () => {
      isActive = false
      activeRegistration?.removeEventListener('updatefound', invalidateOfflineReadiness)
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return null
}