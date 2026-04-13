'use client'

import Script from 'next/script'
import { useEffect, useId, useRef, useState } from 'react'

type TurnstileWidgetProps = {
  siteKey: string
  onTokenChange: (token: string | null) => void
  action?: string
  appearance?: 'always' | 'execute' | 'interaction-only'
  size?: 'normal' | 'compact' | 'flexible'
  containerClassName?: string
  onBeforeInteractive?: () => void
  onAfterInteractive?: () => void
  onWidgetError?: (message: string) => void
  resetKey?: number
}

type TurnstileRenderOptions = {
  sitekey: string
  action?: string
  theme?: 'auto' | 'light' | 'dark'
  size?: 'normal' | 'compact' | 'flexible'
  execution?: 'render' | 'execute'
  appearance?: 'always' | 'execute' | 'interaction-only'
  retry?: 'auto' | 'never'
  'refresh-expired'?: 'auto' | 'manual' | 'never'
  'refresh-timeout'?: 'auto' | 'manual' | 'never'
  'response-field'?: boolean
  callback?: (token: string) => void
  'expired-callback'?: () => void
  'error-callback'?: (errorCode?: string) => void
  'timeout-callback'?: () => void
  'before-interactive-callback'?: () => void
  'after-interactive-callback'?: () => void
}

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

function getWidgetErrorMessage(errorCode?: string) {
  if (!errorCode) {
    return 'Human verification hit a Cloudflare error. Refresh and try again.'
  }

  return `Human verification hit a Cloudflare error (${errorCode}). Refresh and try again.`
}

export function TurnstileWidget({
  siteKey,
  onTokenChange,
  action,
  appearance = 'always',
  size = 'flexible',
  containerClassName,
  onBeforeInteractive,
  onAfterInteractive,
  onWidgetError,
  resetKey = 0,
}: TurnstileWidgetProps) {
  const widgetId = useId().replace(/:/g, '')
  const containerRef = useRef<HTMLDivElement>(null)
  const renderedWidgetIdRef = useRef<string | null>(null)
  const resetKeyRef = useRef(resetKey)
  const onTokenChangeRef = useRef(onTokenChange)
  const onBeforeInteractiveRef = useRef(onBeforeInteractive)
  const onAfterInteractiveRef = useRef(onAfterInteractive)
  const onWidgetErrorRef = useRef(onWidgetError)
  const [isScriptReady, setIsScriptReady] = useState(() => typeof window !== 'undefined' && Boolean(window.turnstile))

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange
    onBeforeInteractiveRef.current = onBeforeInteractive
    onAfterInteractiveRef.current = onAfterInteractive
    onWidgetErrorRef.current = onWidgetError
  }, [onAfterInteractive, onBeforeInteractive, onTokenChange, onWidgetError])

  useEffect(() => {
    if (!isScriptReady || !containerRef.current || renderedWidgetIdRef.current || !window.turnstile) {
      return
    }

    renderedWidgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      theme: 'auto',
      size,
      execution: 'render',
      appearance,
      retry: 'auto',
      'refresh-expired': 'auto',
      'refresh-timeout': 'auto',
      'response-field': false,
      callback: (token) => {
        onTokenChangeRef.current(token)
      },
      'expired-callback': () => {
        onTokenChangeRef.current(null)
      },
      'error-callback': (errorCode) => {
        onTokenChangeRef.current(null)
        onWidgetErrorRef.current?.(getWidgetErrorMessage(errorCode))
      },
      'timeout-callback': () => {
        onTokenChangeRef.current(null)
        onWidgetErrorRef.current?.('Human verification timed out. If another challenge appears, complete it and try again.')
      },
      'before-interactive-callback': () => {
        onBeforeInteractiveRef.current?.()
      },
      'after-interactive-callback': () => {
        onAfterInteractiveRef.current?.()
      },
    })

    return () => {
      if (renderedWidgetIdRef.current && window.turnstile) {
        window.turnstile.remove(renderedWidgetIdRef.current)
        renderedWidgetIdRef.current = null
      }
    }
  }, [action, appearance, isScriptReady, siteKey, size])

  useEffect(() => {
    if (resetKey === resetKeyRef.current) {
      return
    }

    resetKeyRef.current = resetKey
    onTokenChange(null)

    if (renderedWidgetIdRef.current && window.turnstile) {
      window.turnstile.reset(renderedWidgetIdRef.current)
    }
  }, [onTokenChange, resetKey])

  return (
    <>
      <Script
        id="turnstile-api-script"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => {
          setIsScriptReady(true)
        }}
        onError={() => {
            onWidgetErrorRef.current?.('Unable to load human verification right now.')
        }}
      />

      <div id={widgetId} ref={containerRef} className={containerClassName} />
    </>
  )
}