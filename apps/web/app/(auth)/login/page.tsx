'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { AuthTurnstileGate } from '@/components/auth/AuthTurnstileGate'
import { createClient } from '@/lib/supabase/client'
import { getCaptchaFeedbackMessage, isCaptchaRejectionError, turnstileSiteKey } from '@/lib/auth/captcha'
import { sanitizeNextPath } from '@/lib/auth/auth-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BarChart3, Dumbbell, ShieldCheck, Sparkles } from 'lucide-react'

type AuthAction = 'email' | null
type FeedbackState = {
  tone: 'error' | 'status'
  message: string
}

function getDescribedBy(...ids: Array<string | null | undefined>) {
  const describedBy = ids.filter(Boolean).join(' ')
  return describedBy || undefined
}

function getInitialFeedback(errorParam: string | null): FeedbackState | null {
  if (errorParam === 'auth_failed') {
    return {
      tone: 'error',
      message: 'We could not complete that sign-in attempt. Try again.',
    }
  }

  return null
}

export default function LoginPage() {
  const searchParams = useSearchParams()
  const next = sanitizeNextPath(searchParams.get('next'), '/dashboard')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authAction, setAuthAction] = useState<AuthAction>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(getInitialFeedback(searchParams.get('error')))
  const feedbackRef = useRef<HTMLParagraphElement>(null)
  const isPending = authAction !== null
  const continueHref = next === '/dashboard' ? '/continue' : `/continue?next=${encodeURIComponent(next)}`

  useEffect(() => {
    if (feedback) {
      feedbackRef.current?.focus()
    }
  }, [feedback])

  const handleEmailAuth = async (
    event: FormEvent<HTMLFormElement>,
    captchaToken: string | null,
    invalidateCaptcha: () => void,
  ) => {
    event.preventDefault()

    if (!turnstileSiteKey) {
      setFeedback({ tone: 'error', message: 'Email sign-in is unavailable until human verification is configured.' })
      return
    }

    if (!captchaToken) {
      setFeedback({ tone: 'error', message: 'Complete human verification before signing in with email.' })
      return
    }

    const trimmedEmail = email.trim()
    setEmail(trimmedEmail)
    setAuthAction('email')
    setFeedback(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
        options: {
          captchaToken,
        },
      })

      if (error) {
        if (isCaptchaRejectionError(error)) {
          invalidateCaptcha()
        }

        setFeedback({
          tone: 'error',
          message: getCaptchaFeedbackMessage(
            error,
            'Human verification expired or was already used. It has been reset. If Cloudflare asks for another challenge, complete it and try signing in one more time.',
          ),
        })
        return
      }

      window.location.assign(next)
    } catch {
      setFeedback({ tone: 'error', message: 'Unable to complete sign-in right now.' })
    } finally {
      setAuthAction(null)
    }
  }

  return (
    <div className="animate-scale-in overflow-hidden rounded-[32px] border border-border/70 bg-background/82 shadow-[0_36px_110px_-52px_rgba(0,0,0,0.92)] backdrop-blur-xl">
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between gap-8 border-r border-border/70 bg-card/72 p-10 lg:flex">
          <div className="flex flex-col gap-5">
            <Badge variant="outline" className="w-fit rounded-full px-3">
              Returning athletes
            </Badge>
            <div className="flex flex-col gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
                <Dumbbell />
              </div>
              <div className="flex flex-col gap-2">
                <span className="eyebrow">PlateIQ</span>
                <h1 className="text-4xl font-semibold tracking-[-0.08em] text-foreground">
                  Pick up where you left off.
                </h1>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  Sign in to open your current cycle, check the next workout, and keep your training history in one place.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <Card size="sm" className="border-border/70 bg-background/60">
              <CardContent className="flex items-start gap-3 pt-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <BarChart3 />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">Know what&apos;s next</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Open the app and see the block, lift order, and progression details without digging.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card size="sm" className="border-border/70 bg-background/60">
              <CardContent className="flex items-start gap-3 pt-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Sparkles />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">Programming that stays readable</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Move from proven templates to custom builds without losing track of the structure.
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
                  <p className="text-sm font-medium text-foreground">Stay in sync</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Keep sessions, program changes, and next-cycle setup aligned across devices.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="flex flex-col gap-6 px-6 py-8 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-3">
            <Badge variant="outline" className="w-fit rounded-full px-3 lg:hidden">
              Returning athletes
            </Badge>
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
                <Dumbbell />
              </div>
              <div className="flex flex-col gap-1">
                <span className="eyebrow">PlateIQ</span>
                <span className="text-xl font-semibold tracking-[-0.06em] text-foreground">Welcome back</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-semibold tracking-[-0.06em] text-foreground">
                Sign in
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Use your email and password.
              </p>
            </div>
          </div>

          <AuthTurnstileGate
            action="email_sign_in"
            actionLabel="email sign-in"
            siteKey={turnstileSiteKey}
            unavailableText="Email sign-in is temporarily unavailable while human verification is being configured."
          >
            {({ token, canProceed, invalidate, statusId }) => (
              <form
                onSubmit={(event) => void handleEmailAuth(event, token, invalidate)}
                className="flex flex-col gap-4"
                aria-busy={isPending}
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isPending}
                    required
                    aria-describedby={getDescribedBy('login-email-help', feedback?.tone === 'error' ? 'login-feedback' : undefined)}
                  />
                  <p id="login-email-help" className="text-xs text-muted-foreground">
                    Use the email address tied to your training account.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isPending}
                    required
                    minLength={6}
                    aria-describedby={getDescribedBy('login-password-help', feedback?.tone === 'error' ? 'login-feedback' : undefined)}
                  />
                  <p id="login-password-help" className="text-xs text-muted-foreground">
                    Enter the password for this account.
                  </p>
                </div>

                {feedback && (
                  <p
                    id="login-feedback"
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

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isPending || !canProceed}
                  aria-describedby={statusId}
                >
                  {authAction === 'email' ? 'Signing in…' : 'Sign In'}
                </Button>
              </form>
            )}
          </AuthTurnstileGate>

          <p className="text-center text-sm text-muted-foreground">
            Need guest mode or first-time setup?{' '}
            <Link href={continueHref} className="font-medium text-primary underline-offset-4 hover:underline">
              Get Started
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
