'use client'

import { CircleAlert, Loader2, ShieldCheck } from 'lucide-react'
import { useCallback, useId, useState, type ReactNode } from 'react'
import { TurnstileWidget } from '@/components/auth/TurnstileWidget'
import { cn } from '@/lib/utils'

type VerificationState = 'unavailable' | 'checking' | 'interaction' | 'verified' | 'rejected' | 'error'
type InvalidateReason = 'backend-rejected' | 'expired' | 'error'
type PresentationMode = 'default' | 'minimal'

type AuthTurnstileGateRenderProps = {
  token: string | null
  canProceed: boolean
  invalidate: (reason?: InvalidateReason) => void
  state: VerificationState
  statusId: string
}

type AuthTurnstileGateProps = {
  action: string
  actionLabel: string
  siteKey: string
  unavailableText: string
  presentation?: PresentationMode
  children: (props: AuthTurnstileGateRenderProps) => ReactNode
}

function shouldShowVisibleStatus(state: VerificationState, presentation: PresentationMode) {
  if (presentation === 'default') {
    return true
  }

  return state === 'unavailable' || state === 'error'
}

function getStatusText(state: VerificationState, actionLabel: string, unavailableText: string, widgetError: string | null) {
  switch (state) {
    case 'unavailable':
      return unavailableText
    case 'interaction':
      return `Cloudflare needs a quick check before ${actionLabel}. Complete it if the challenge appears.`
    case 'verified':
      return `Human verification is ready for ${actionLabel}.`
    case 'rejected':
      return 'The last verification token was rejected. It has been reset. If Cloudflare asks for another challenge, complete it and try again.'
    case 'error':
      return widgetError ?? 'Human verification is unavailable right now.'
    case 'checking':
    default:
      return `Human verification is running in the background for ${actionLabel}.`
  }
}

function getStatusTone(state: VerificationState) {
  switch (state) {
    case 'verified':
      return 'success'
    case 'rejected':
    case 'error':
    case 'unavailable':
      return 'error'
    case 'interaction':
      return 'attention'
    case 'checking':
    default:
      return 'muted'
  }
}

function StatusIcon({ state }: { state: VerificationState }) {
  if (state === 'checking') {
    return <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden="true" />
  }

  if (state === 'verified' || state === 'interaction') {
    return <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
  }

  return <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
}

export function AuthTurnstileGate({
  action,
  actionLabel,
  siteKey,
  unavailableText,
  presentation = 'default',
  children,
}: AuthTurnstileGateProps) {
  const statusId = useId().replace(/:/g, '')
  const [token, setToken] = useState<string | null>(null)
  const [state, setState] = useState<VerificationState>(siteKey ? 'checking' : 'unavailable')
  const [resetKey, setResetKey] = useState(0)
  const [widgetError, setWidgetError] = useState<string | null>(null)
  const [isInteractive, setIsInteractive] = useState(false)

  const handleTokenChange = useCallback(
    (nextToken: string | null) => {
      if (nextToken) {
        setToken(nextToken)
        setWidgetError(null)
        setState('verified')
        setIsInteractive(false)
        return
      }

      setToken(null)
      setState((current) => {
        if (current === 'unavailable' || current === 'error' || current === 'rejected') {
          return current
        }

        return isInteractive ? 'interaction' : 'checking'
      })
    },
    [isInteractive],
  )

  const invalidate = useCallback((reason: InvalidateReason = 'backend-rejected') => {
    setToken(null)
    setWidgetError(null)
    setIsInteractive(false)
    setState(reason === 'backend-rejected' ? 'rejected' : reason === 'error' ? 'error' : 'checking')
    setResetKey((current) => current + 1)
  }, [])

  const handleBeforeInteractive = useCallback(() => {
    setWidgetError(null)
    setIsInteractive(true)
    setState('interaction')
  }, [])

  const handleAfterInteractive = useCallback(() => {
    setIsInteractive(false)
    setState((current) => (current === 'verified' || current === 'rejected' || current === 'error' ? current : 'checking'))
  }, [])

  const handleWidgetError = useCallback((message: string) => {
    setToken(null)
    setWidgetError(message)
    setIsInteractive(false)
    setState('error')
  }, [])

  const statusText = getStatusText(state, actionLabel, unavailableText, widgetError)
  const statusTone = getStatusTone(state)
  const canProceed = Boolean(siteKey && token)
  const showVisibleStatus = shouldShowVisibleStatus(state, presentation)

  return (
    <div className="flex flex-col gap-3">
      {siteKey && (
        <div
          className={cn(
            'overflow-hidden transition-[max-height,opacity] duration-200 motion-reduce:transition-none',
            isInteractive ? 'max-h-32 opacity-100' : 'pointer-events-none max-h-0 opacity-0',
          )}
        >
          <TurnstileWidget
            siteKey={siteKey}
            action={action}
            appearance="interaction-only"
            onTokenChange={handleTokenChange}
            onBeforeInteractive={handleBeforeInteractive}
            onAfterInteractive={handleAfterInteractive}
            onWidgetError={handleWidgetError}
            resetKey={resetKey}
            containerClassName="min-h-18"
          />
        </div>
      )}

      <p
        id={statusId}
        role={statusTone === 'error' ? 'alert' : 'status'}
        aria-live={statusTone === 'error' ? 'assertive' : 'polite'}
        className={showVisibleStatus
          ? cn(
              'rounded-2xl border px-3 py-2 text-sm leading-6',
              statusTone === 'success' && 'border-primary/20 bg-primary/5 text-foreground',
              statusTone === 'attention' && 'border-border/70 bg-card/70 text-foreground',
              statusTone === 'error' && 'border-destructive/20 bg-destructive/5 text-destructive',
              statusTone === 'muted' && 'border-border/70 bg-background/60 text-muted-foreground',
            )
          : 'sr-only'}
      >
        {showVisibleStatus ? (
          <span className="flex items-start gap-2">
            <StatusIcon state={state} />
            <span>{statusText}</span>
          </span>
        ) : statusText}
      </p>

      {children({ token, canProceed, invalidate, state, statusId })}
    </div>
  )
}
