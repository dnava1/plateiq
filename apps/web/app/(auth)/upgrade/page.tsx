'use client'

import Link from 'next/link'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Dumbbell } from 'lucide-react'
import { sanitizeNextPath } from '@/lib/auth/auth-state'
import {
  EXISTING_GOOGLE_IDENTITY_ERROR_CODE,
  EXISTING_GOOGLE_UPGRADE_MODE,
  getExistingGoogleUpgradeRedirect,
} from '@/lib/auth/google-upgrade'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'

type UpgradeAction =
  | 'upgrade-google'
  | null

type FeedbackState = {
  tone: 'error' | 'status'
  message: string
}

function hasExistingAccountRetrySignal(upgradeMode: string | null) {
  if (upgradeMode === EXISTING_GOOGLE_UPGRADE_MODE) {
    return true
  }

  if (typeof window === 'undefined') {
    return false
  }

  const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash)
  return hashParams.get('error_code') === EXISTING_GOOGLE_IDENTITY_ERROR_CODE
}

function getInitialFeedback(errorParam: string | null, upgradeMode: string | null): FeedbackState | null {
  if (errorParam !== 'auth_failed' || hasExistingAccountRetrySignal(upgradeMode)) {
    return null
  }

  return {
    tone: 'error',
    message: 'We could not complete that Google sign-in. Try again.',
  }
}

export default function UpgradePage() {
  const searchParams = useSearchParams()
  const { data: user, isLoading } = useUser()
  const errorParam = searchParams.get('error')
  const upgradeMode = searchParams.get('upgrade_mode')
  const [action, setAction] = useState<UpgradeAction>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [dismissedUrlFeedbackKey, setDismissedUrlFeedbackKey] = useState<string | null>(null)
  const feedbackRef = useRef<HTMLParagraphElement>(null)
  const existingAccountConflictRef = useRef(false)
  const existingAccountRetryStartedRef = useRef(false)
  const initialFeedback = getInitialFeedback(errorParam, upgradeMode)
  const urlFeedbackKey = initialFeedback
    ? `${errorParam ?? ''}:${upgradeMode ?? ''}:${typeof window === 'undefined' ? '' : window.location.hash}`
    : null
  const visibleFeedback = feedback ?? (
    urlFeedbackKey && urlFeedbackKey !== dismissedUrlFeedbackKey
      ? initialFeedback
      : null
  )

  const clearVisibleFeedback = () => {
    if (urlFeedbackKey) {
      setDismissedUrlFeedbackKey(urlFeedbackKey)
    }

    setFeedback(null)
  }

  useEffect(() => {
    if (visibleFeedback) {
      feedbackRef.current?.focus()
    }
  }, [visibleFeedback])

  const nextAfterUpgrade = sanitizeNextPath('/settings', '/settings')

  const clearPreparedExistingGoogleSignIn = async () => {
    try {
      await fetch('/api/auth/upgrade/discard', {
        method: 'DELETE',
      })
    } catch {
      return
    }
  }

  const handleExistingAccountGoogleSignIn = async () => {
    setAction('upgrade-google')
    clearVisibleFeedback()
    let preparedExistingAccountGoogleSignIn = false

    try {
      const prepareResponse = await fetch('/api/auth/upgrade/discard', {
        method: 'POST',
      })

      if (!prepareResponse.ok) {
        setFeedback({ tone: 'error', message: 'Unable to switch to your existing Google account right now.' })
        setAction(null)
        return
      }

      preparedExistingAccountGoogleSignIn = true

      const supabase = createClient()

      // Obtain the OAuth URL before signing out so the redirect can follow
      // the sign-out synchronously, preventing React from re-rendering with
      // a stale auth state (which would flash the "unavailable" screen).
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getExistingGoogleUpgradeRedirect(window.location.origin, nextAfterUpgrade),
          skipBrowserRedirect: true,
        },
      })

      if (oauthError || !data?.url) {
        await clearPreparedExistingGoogleSignIn()
        setFeedback({ tone: 'error', message: 'Unable to switch to your existing Google account right now.' })
        setAction(null)
        return
      }

      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })

      if (signOutError) {
        await clearPreparedExistingGoogleSignIn()
        setFeedback({ tone: 'error', message: 'Unable to switch to your existing Google account right now.' })
        setAction(null)
        return
      }

      // Navigate on the same synchronous tick as the signOut resolution so
      // the browser begins unloading before React can process the auth-state
      // change triggered by the sign-out.
      window.location.href = data.url
    } catch {
      if (preparedExistingAccountGoogleSignIn) {
        await clearPreparedExistingGoogleSignIn()
      }

      setFeedback({ tone: 'error', message: 'Unable to switch to your existing Google account right now.' })
      setAction(null)
    }
  }

  const retryExistingAccountGoogleSignIn = useEffectEvent(() => {
    void handleExistingAccountGoogleSignIn()
  })

  const handleGoogleUpgrade = async () => {
    if (existingAccountConflictRef.current || upgradeMode === EXISTING_GOOGLE_UPGRADE_MODE) {
      await handleExistingAccountGoogleSignIn()
      return
    }

    setAction('upgrade-google')
    clearVisibleFeedback()

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextAfterUpgrade)}`,
        },
      })

      if (error) {
        setFeedback({ tone: 'error', message: error.message })
        setAction(null)
        return
      }
    } catch {
      setFeedback({ tone: 'error', message: 'Unable to start Google sign-in right now.' })
      setAction(null)
    }
  }

  useEffect(() => {
    if (
      typeof window === 'undefined'
      || existingAccountRetryStartedRef.current
      || !user?.is_anonymous
    ) {
      return
    }

    const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash)
    const hasExistingAccountConflict = (
      upgradeMode === EXISTING_GOOGLE_UPGRADE_MODE
      || hashParams.get('error_code') === EXISTING_GOOGLE_IDENTITY_ERROR_CODE
    )

    if (!hasExistingAccountConflict) {
      return
    }

    existingAccountRetryStartedRef.current = true
    existingAccountConflictRef.current = true

    const normalizedSearchParams = new URLSearchParams(window.location.search)
    normalizedSearchParams.delete('error')
    normalizedSearchParams.set('upgrade_mode', EXISTING_GOOGLE_UPGRADE_MODE)
    const normalizedSearch = normalizedSearchParams.toString()

    window.history.replaceState(
      window.history.state,
      '',
      normalizedSearch ? `${window.location.pathname}?${normalizedSearch}` : window.location.pathname,
    )

    queueMicrotask(() => {
      retryExistingAccountGoogleSignIn()
    })
  }, [upgradeMode, user?.id, user?.is_anonymous])

  const isPending = action !== null || isLoading

  if (!user && !isLoading && action === null) {
    return (
      <div className="animate-scale-in rounded-[32px] border border-border/70 bg-background/82 p-8 shadow-[0_36px_110px_-52px_rgba(0,0,0,0.92)] backdrop-blur-xl">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold tracking-[-0.06em] text-foreground">Google sign-in unavailable</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            You need an active guest session before you can sign in with Google.
          </p>
          <Link href="/continue" className={buttonVariants({ size: 'lg', className: 'w-full sm:w-auto' })}>
            Return to Get Started
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-xl animate-scale-in rounded-[32px] border border-border/70 bg-background/82 p-6 shadow-[0_36px_110px_-52px_rgba(0,0,0,0.92)] backdrop-blur-xl sm:p-8">
      <section className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
            <Dumbbell />
          </div>
          <div className="flex flex-col gap-1">
            <span className="eyebrow">PlateIQ</span>
            <span className="text-xl font-semibold tracking-[-0.06em] text-foreground">Sign In</span>
          </div>
        </div>

        {visibleFeedback && (
          <p
            ref={feedbackRef}
            tabIndex={-1}
            role={visibleFeedback.tone === 'error' ? 'alert' : 'status'}
            aria-live={visibleFeedback.tone === 'error' ? 'assertive' : 'polite'}
            className={visibleFeedback.tone === 'error'
              ? 'rounded-2xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive'
              : 'rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground'}
          >
            {visibleFeedback.message}
          </p>
        )}

        <div className="flex flex-col gap-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Sign in with Google to keep this temporary guest session and continue with a permanent account.
          </p>

          <Button
            type="button"
            onClick={handleGoogleUpgrade}
            size="lg"
            disabled={isPending}
            className="w-full justify-center gap-3 rounded-2xl border border-border/70 bg-card/70 px-4 text-foreground hover:bg-muted/60"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>{action === 'upgrade-google' ? 'Redirecting to Google…' : 'Sign In with Google'}</span>
          </Button>
        </div>

        <Link href="/settings" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Return to settings
        </Link>
      </section>
    </div>
  )
}