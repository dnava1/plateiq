'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Download, Ellipsis, SquareArrowUp, SquarePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

function isAndroidDevice(userAgent: string) {
  return /Android/i.test(userAgent)
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

type InstallMode = 'hidden' | 'prompt' | 'ios-safari' | 'ios-browser' | 'android-browser'

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
  const isAndroid = isAndroidDevice(userAgent)
  const safari = isIosSafari(userAgent)

  return {
    dismissed,
    installMode: isStandalone ? 'hidden' : isIos ? (safari ? 'ios-safari' : 'ios-browser') : isAndroid ? 'android-browser' : 'hidden',
    isReady: true,
    isStandalone,
  }
}

function usesMobileAppNav(pathname: string) {
  return ['/analytics', '/dashboard', '/programs', '/settings', '/workouts'].some((path) =>
    pathname === path || pathname.startsWith(`${path}/`),
  )
}

function InlineInstructionIcon({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span
      aria-label={label}
      className="inline-flex size-6 items-center justify-center rounded-lg border border-border/70 bg-muted/55 text-foreground align-[-0.35rem]"
      role="img"
    >
      {children}
    </span>
  )
}

function InlineInstructionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-foreground">
      {children}
    </span>
  )
}

export function PwaSupport() {
  const pathname = usePathname()
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

  const title = installMode === 'prompt'
    ? 'Install PlateIQ'
    : installMode === 'ios-browser'
      ? 'Open in Safari to install'
      : 'Add PlateIQ to Home Screen'
  const copy = installMode === 'prompt'
    ? 'Install PlateIQ for a full-screen app experience with offline workout support.'
    : installMode === 'ios-safari'
      ? (
        <>
          In Safari, tap{' '}
          <InlineInstructionIcon label="More">
            <Ellipsis className="size-4" />
          </InlineInstructionIcon>, then{' '}
          <InlineInstructionLabel>
            <SquareArrowUp className="size-4" />
            Share
          </InlineInstructionLabel>, choose{' '}
          <InlineInstructionLabel>
            <SquarePlus className="size-4" />
            Add to Home Screen
          </InlineInstructionLabel>, keep Open as Web App on, then tap Add.
        </>
      )
      : installMode === 'android-browser'
        ? 'In Chrome on Android, tap More, Add to home screen, then Install.'
        : 'On iPhone or iPad, open PlateIQ in Safari first. Safari is required for the Home Screen web app flow.'
  const shouldShowStepRow = installMode === 'android-browser'

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 md:bottom-6',
        usesMobileAppNav(pathname)
          ? 'bottom-[calc(env(safe-area-inset-bottom)+5.25rem)]'
          : 'bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]',
      )}
    >
      <section
        aria-label="Install PlateIQ"
        className="pointer-events-auto w-full max-w-md rounded-[28px] border border-border/70 bg-background/96 p-4 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.82)] backdrop-blur-xl"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
            {installMode === 'prompt' ? <Download className="size-5" /> : installMode === 'android-browser' ? <Ellipsis className="size-5" /> : <SquareArrowUp className="size-5" />}
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

            {shouldShowStepRow ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-muted/45 px-3 py-2.5 text-sm text-muted-foreground">
                <Ellipsis className="size-4 text-foreground" />
                <span>More</span>
                <span className="opacity-50">then</span>
                <SquarePlus className="size-4 text-foreground" />
                <span>Add to home screen</span>
                <span className="opacity-50">then</span>
                <Download className="size-4 text-foreground" />
                <span>Install</span>
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
