'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, Loader2, UserRound } from 'lucide-react'
import { AuthTurnstileGate } from '@/components/auth/AuthTurnstileGate'
import { PlateIqMark } from '@/components/brand/PlateIqMark'
import { isCaptchaRejectionError, isInvalidCaptchaResponseError, turnstileSiteKey } from '@/lib/auth/captcha'
import { GOOGLE_OAUTH_SCOPES } from '@/lib/auth/google'
import { sanitizeNextPath } from '@/lib/auth/auth-state'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

type AuthAction = 'guest' | 'google' | null
type FeedbackState = {
  tone: 'error' | 'status'
  message: string
}

function getInitialFeedback(errorParam: string | null): FeedbackState | null {
  if (errorParam !== 'auth_failed') {
    return null
  }

  return {
    tone: 'error',
    message: 'We could not complete that Google sign-in attempt. Try guest mode or Google again.',
  }
}

function isLocalDevelopmentHost() {
  if (typeof window === 'undefined') {
    return false
  }

  const { hostname } = window.location
  return (
    hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '::1'
    || hostname === '[::1]'
    || hostname.endsWith('.localhost')
  )
}

export default function ContinuePage() {
  return (
    <Suspense fallback={null}>
      <ContinuePageContent />
    </Suspense>
  )
}

function ContinuePageContent() {
  const searchParams = useSearchParams()
  const next = sanitizeNextPath(searchParams.get('next'), '/dashboard')
  const errorParam = searchParams.get('error')
  const [authAction, setAuthAction] = useState<AuthAction>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(() => getInitialFeedback(errorParam))
  const feedbackRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (feedback) {
      feedbackRef.current?.focus()
    }
  }, [feedback])

  const handleGuestContinue = async (
    captchaToken: string | null,
    invalidateCaptcha: (reason?: 'backend-rejected' | 'expired' | 'error') => void,
  ) => {
    if (!turnstileSiteKey) {
      setFeedback({ tone: 'error', message: 'Guest mode is unavailable until human verification is configured.' })
      return
    }

    if (!captchaToken) {
      setFeedback({ tone: 'error', message: 'Complete the human verification challenge before starting guest mode.' })
      return
    }

    setAuthAction('guest')
    setFeedback(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInAnonymously({
        options: {
          captchaToken,
        },
      })

      if (error) {
        setAuthAction(null)

        if (isCaptchaRejectionError(error)) {
          invalidateCaptcha('expired')

          if (isLocalDevelopmentHost() && isInvalidCaptchaResponseError(error)) {
            setFeedback({
              tone: 'error',
              message: 'Local guest verification is misconfigured. Check that Supabase CAPTCHA uses the secret for this Cloudflare site key and that localhost is allowed in the Turnstile widget.',
            })
          }

          return
        }

        setFeedback({
          tone: 'error',
          message: error.message || 'Unable to start a guest session right now.',
        })
        return
      }

      // Keep authAction as 'guest' so the button stays in "Starting guest session…"
      // until navigation completes — never reset on success.
      window.location.assign(next)
    } catch {
      setAuthAction(null)
      setFeedback({ tone: 'error', message: 'Unable to start a guest session right now.' })
    }
  }

  const handleGoogleContinue = async () => {
    setAuthAction('google')
    setFeedback(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          scopes: GOOGLE_OAUTH_SCOPES,
        },
      })

      if (error) {
        setFeedback({ tone: 'error', message: error.message })
        setAuthAction(null)
        return
      }
    } catch {
      setFeedback({ tone: 'error', message: 'Unable to start Google sign-in right now.' })
      setAuthAction(null)
    }
  }

  const isPending = authAction !== null

  return (
    <div className="auth-panel mx-auto w-full max-w-xl animate-scale-in p-6 sm:p-8">
      <section className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <PlateIqMark className="size-14" />
          <div className="flex flex-col gap-1">
            <span className="eyebrow">PlateIQ</span>
            <h1 className="text-xl font-semibold tracking-[-0.06em] text-foreground">Get Started</h1>
          </div>
        </div>

        <AuthTurnstileGate
          action="guest_entry"
          actionLabel="guest entry"
          siteKey={turnstileSiteKey}
          unavailableText="Guest mode is temporarily unavailable while human verification is being configured."
          presentation="minimal"
        >
          {({ token, canProceed, invalidate, state, statusId }) => {
            const isPreparingGuest = state === 'checking' && !canProceed

            return (
              <Button
                type="button"
                size="lg"
                className="w-full justify-between"
                disabled={isPending || !canProceed}
                aria-describedby={statusId}
                onClick={() => void handleGuestContinue(token, invalidate)}
              >
                <span className="flex items-center gap-3">
                  <UserRound />
                  <span>{authAction === 'guest' ? 'Starting guest session…' : 'Continue as Guest'}</span>
                </span>
                {isPreparingGuest ? (
                  <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <ArrowRight />
                )}
              </Button>
            )
          }}
        </AuthTurnstileGate>

        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <Button
          type="button"
          onClick={handleGoogleContinue}
          size="lg"
          disabled={isPending}
          className="w-full justify-between rounded-2xl border border-border/70 bg-card/70 px-4 text-foreground hover:bg-muted/60"
        >
          <span className="flex items-center gap-3">
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
            <span>{authAction === 'google' ? 'Redirecting to Google…' : 'Continue with Google'}</span>
          </span>
          <ArrowRight />
        </Button>

        {feedback && (
          <p
            ref={feedbackRef}
            tabIndex={-1}
            role={feedback.tone === 'error' ? 'alert' : 'status'}
            aria-live={feedback.tone === 'error' ? 'assertive' : 'polite'}
            className={feedback.tone === 'error'
              ? 'rounded-2xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive'
              : 'rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground'}
          >
            {feedback.message}
          </p>
        )}
      </section>
    </div>
  )
}
