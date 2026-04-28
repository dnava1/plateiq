'use client'

import { useEffect, useState } from 'react'
import { Download, Plus, Share2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DISMISS_KEY = 'plateiq-pwa-install-dismissed-v1'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

function isIosDevice(userAgent: string) {
  return /iPad|iPhone|iPod/i.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isIosSafari(userAgent: string) {
  return isIosDevice(userAgent) && /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(userAgent)
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return
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
}

async function unregisterServiceWorkers() {
  if (!('serviceWorker' in navigator)) {
    return
  }

  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map((registration) => registration.unregister()))
}

type InstallMode = 'hidden' | 'prompt' | 'ios-safari' | 'ios-browser'

interface PwaUiState {
  dismissed: boolean
  installMode: InstallMode
  isReady: boolean
  isStandalone: boolean
}

function resolvePwaUiState(): PwaUiState {
  const userAgent = navigator.userAgent
  const isStandalone = isStandaloneMode()
  const dismissed = window.localStorage.getItem(DISMISS_KEY) === '1'
  const isIos = isIosDevice(userAgent)
  const safari = isIosSafari(userAgent)

  return {
    dismissed,
    installMode: isStandalone ? 'hidden' : isIos ? (safari ? 'ios-safari' : 'ios-browser') : 'hidden',
    isReady: true,
    isStandalone,
  }
}

export function PwaSupport() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [uiState, setUiState] = useState<PwaUiState>({
    dismissed: true,
    installMode: 'hidden',
    isReady: false,
    isStandalone: false,
  })

  useEffect(() => {
    const animationFrameId = window.requestAnimationFrame(() => {
      setUiState(resolvePwaUiState())
    })

    if (process.env.NODE_ENV === 'production') {
      void registerServiceWorker().catch(() => undefined)
    } else {
      void unregisterServiceWorkers().catch(() => undefined)
    }

    if ('storage' in navigator && 'persist' in navigator.storage) {
      void navigator.storage.persist().catch(() => undefined)
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setUiState((currentState) => ({
        ...currentState,
        installMode: 'prompt',
      }))
    }

    const handleInstalled = () => {
      window.localStorage.removeItem(DISMISS_KEY)
      setDeferredPrompt(null)
      setUiState({
        dismissed: false,
        installMode: 'hidden',
        isReady: true,
        isStandalone: true,
      })
    }

    const handleDisplayModeChange = () => {
      setUiState((currentState) => {
        const nextState = resolvePwaUiState()

        if (currentState.installMode === 'prompt' && !nextState.isStandalone) {
          return {
            ...nextState,
            installMode: 'prompt',
          }
        }

        return nextState
      })
    }

    const displayMode = window.matchMedia('(display-mode: standalone)')

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)
    window.addEventListener('appinstalled', handleInstalled)
    window.addEventListener('pageshow', handleDisplayModeChange)
    displayMode.addEventListener('change', handleDisplayModeChange)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)
      window.removeEventListener('appinstalled', handleInstalled)
      window.removeEventListener('pageshow', handleDisplayModeChange)
      displayMode.removeEventListener('change', handleDisplayModeChange)
    }
  }, [])

  const { dismissed, installMode, isReady, isStandalone } = uiState
  const shouldRender = isReady && !isStandalone && !dismissed && installMode !== 'hidden'

  if (!shouldRender) {
    return null
  }

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, '1')
    setUiState((currentState) => ({
      ...currentState,
      dismissed: true,
    }))
  }

  const install = async () => {
    if (!deferredPrompt) {
      return
    }

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice

    if (choice.outcome === 'accepted') {
      window.localStorage.removeItem(DISMISS_KEY)
    }

    setDeferredPrompt(null)
    if (choice.outcome === 'dismissed') {
      setUiState((currentState) => ({
        ...currentState,
        installMode: 'hidden',
      }))
    }
  }

  const title = installMode === 'prompt' ? 'Install PlateIQ' : 'Add PlateIQ to Home Screen'
  const copy = installMode === 'prompt'
    ? 'Launch PlateIQ in a full-screen app window with faster startup and an offline fallback.'
    : installMode === 'ios-safari'
      ? 'On iPhone or iPad, tap Share and then Add to Home Screen for the full app experience.'
      : 'Open this page in Safari, then use Share and Add to Home Screen to install PlateIQ on iPhone or iPad.'

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-50 flex justify-center px-4 md:bottom-6">
      <section
        aria-label="Install PlateIQ"
        className="pointer-events-auto w-full max-w-md rounded-[28px] border border-border/70 bg-background/96 p-4 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.82)] backdrop-blur-xl"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
            {installMode === 'prompt' ? <Download className="size-5" /> : <Share2 className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy}</p>
              </div>
              <Button
                aria-label="Dismiss install prompt"
                className="shrink-0"
                size="icon-sm"
                variant="ghost"
                onClick={dismiss}
              >
                <X className="size-4" />
              </Button>
            </div>

            {installMode === 'ios-safari' ? (
              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/45 px-3 py-2.5 text-sm text-muted-foreground">
                <Share2 className="size-4 text-foreground" />
                <span>Share</span>
                <span className="opacity-50">then</span>
                <Plus className="size-4 text-foreground" />
                <span>Add to Home Screen</span>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {installMode === 'prompt' ? (
                <Button size="sm" onClick={() => void install()}>
                  <Download />
                  Install App
                </Button>
              ) : null}
              <Button size="sm" variant="outline" onClick={dismiss}>
                Not now
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
