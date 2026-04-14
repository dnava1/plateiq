'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, Dumbbell, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { AuthTurnstileGate } from '@/components/auth/AuthTurnstileGate'
import { isCaptchaRejectionError, isInvalidCaptchaResponseError, turnstileSiteKey } from '@/lib/auth/captcha'
import { clearPendingGuestMergeClient } from '@/lib/auth/merge-client'
import { sanitizeNextPath } from '@/lib/auth/auth-state'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

type AuthAction = 'guest' | 'google' | null
type FeedbackState = {
  tone: 'error' | 'status'
  message: string
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
  const searchParams = useSearchParams()
  const next = sanitizeNextPath(searchParams.get('next'), '/dashboard')
  const [authAction, setAuthAction] = useState<AuthAction>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const feedbackRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (feedback) {
      feedbackRef.current?.focus()
    }
  }, [feedback])

  const loginHref = next === '/dashboard' ? '/login' : `/login?next=${encodeURIComponent(next)}`

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
      await clearPendingGuestMergeClient().catch(() => undefined)

      const supabase = createClient()
      const { error } = await supabase.auth.signInAnonymously({
        options: {
          captchaToken,
        },
      })

      if (error) {
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

      window.location.assign(next)
    } catch {
      setFeedback({ tone: 'error', message: 'Unable to start a guest session right now.' })
    } finally {
      setAuthAction(null)
    }
  }

  const handleGoogleContinue = async () => {
    setAuthAction('google')
    setFeedback(null)

    try {
      await clearPendingGuestMergeClient().catch(() => undefined)

      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })

      if (error) {
        setFeedback({ tone: 'error', message: error.message })
        setAuthAction(null)
        return
      }

      setFeedback({ tone: 'status', message: 'Redirecting to Google…' })
    } catch {
      setFeedback({ tone: 'error', message: 'Unable to start Google sign-in right now.' })
      setAuthAction(null)
    }
  }

  const isPending = authAction !== null

  return (
    <div className="animate-scale-in overflow-hidden rounded-[32px] border border-border/70 bg-background/82 shadow-[0_36px_110px_-52px_rgba(0,0,0,0.92)] backdrop-blur-xl">
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between gap-8 border-r border-border/70 bg-card/72 p-10 lg:flex">
          <div className="flex flex-col gap-5">
            <Badge variant="outline" className="w-fit rounded-full px-3">
              Start without friction
            </Badge>
            <div className="flex flex-col gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
                <Dumbbell />
              </div>
              <div className="flex flex-col gap-2">
                <span className="eyebrow">PlateIQ</span>
                <h1 className="text-4xl font-semibold tracking-[-0.08em] text-foreground">
                    Get Started
                </h1>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  Start training in seconds.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <Card size="sm" className="border-border/70 bg-background/60">
              <CardContent className="flex items-start gap-3 pt-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <UserRound />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">Guest sessions are real accounts</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Your cycle, workouts, maxes, and preferences stay tied to a temporary user instead of living in a browser draft.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card size="sm" className="border-border/70 bg-background/60">
              <CardContent className="flex items-start gap-3 pt-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <ShieldCheck />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">Create an account when you&apos;re ready</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Link Google, add email and password, or merge this guest history into an existing PlateIQ account later.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="flex flex-col gap-6 px-6 py-8 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-3">
            <Badge variant="outline" className="w-fit rounded-full px-3 lg:hidden">
              Start without friction
            </Badge>
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
                <Dumbbell />
              </div>
              <div className="flex flex-col gap-1">
                <span className="eyebrow">PlateIQ</span>
                <span className="text-xl font-semibold tracking-[-0.06em] text-foreground">Get Started</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-semibold tracking-[-0.06em] text-foreground">
                Get Started
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Start with a guest session for the fastest path, or use Google or email if you already have a PlateIQ account.
              </p>
            </div>
          </div>

          <AuthTurnstileGate
            action="guest_entry"
            actionLabel="guest entry"
            siteKey={turnstileSiteKey}
            unavailableText="Guest mode is temporarily unavailable while human verification is being configured."
            presentation="minimal"
          >
            {({ token, canProceed, invalidate, statusId }) => (
              <>
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
                  <ArrowRight />
                </Button>

                <p className="text-sm leading-6 text-muted-foreground">
                  Guest mode keeps your training data on a temporary account immediately, then lets you create a permanent account or merge it later from settings.
                </p>
              </>
            )}
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

          <Link
            href={loginHref}
            className={buttonVariants({
              variant: 'outline',
              size: 'lg',
              className: 'w-full justify-between rounded-2xl border-border/70 bg-card/70 px-4 text-foreground hover:bg-muted/60',
            })}
          >
            <span className="flex items-center gap-3">
              <Mail />
              <span>Use Email to Sign In</span>
            </span>
            <ArrowRight />
          </Link>

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
    </div>
  )
}