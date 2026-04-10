'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ArrowRight, BarChart3, Dumbbell, ShieldCheck, Sparkles } from 'lucide-react'

type AuthAction = 'email' | 'google' | null
type FeedbackState = {
  tone: 'error' | 'status'
  message: string
}

function getDescribedBy(...ids: Array<string | null | undefined>) {
  const describedBy = ids.filter(Boolean).join(' ')
  return describedBy || undefined
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [authAction, setAuthAction] = useState<AuthAction>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const feedbackRef = useRef<HTMLParagraphElement>(null)
  const isPending = authAction !== null

  useEffect(() => {
    if (feedback) {
      feedbackRef.current?.focus()
    }
  }, [feedback])

  const handleGoogleLogin = async () => {
    setAuthAction('google')
    setFeedback(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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

  const handleEmailAuth = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const trimmedEmail = email.trim()

    setEmail(trimmedEmail)
    setAuthAction('email')
    setFeedback(null)

    try {
      const supabase = createClient()

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) {
          setFeedback({ tone: 'error', message: error.message })
          return
        }

        setFeedback({ tone: 'status', message: 'Check your email for a confirmation link.' })
        return
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      if (error) {
        setFeedback({ tone: 'error', message: error.message })
        return
      }

      window.location.assign('/dashboard')
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
              For lifters who train often
            </Badge>
            <div className="flex flex-col gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
                <Dumbbell />
              </div>
              <div className="flex flex-col gap-2">
                <span className="eyebrow">PlateIQ</span>
                <h1 className="text-4xl font-semibold tracking-[-0.08em] text-foreground">
                  Pick up today&apos;s session.
                </h1>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  Sign in to see your active cycle, adjust training maxes, and keep the next block moving.
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
                    Keep your sessions, program changes, and next-cycle setup aligned across devices.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="flex flex-col gap-6 px-6 py-8 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-3">
            <Badge variant="outline" className="w-fit rounded-full px-3 lg:hidden">
              Daily training
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
                {isSignUp ? 'Create your PlateIQ account' : 'Sign in to PlateIQ'}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Open your current program, review today&apos;s work, and adjust what comes next when you need to.
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleGoogleLogin}
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

          <div className="flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={handleEmailAuth} className="flex flex-col gap-4" aria-busy={isPending}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                required
                minLength={6}
                aria-describedby={getDescribedBy('login-password-help', feedback?.tone === 'error' ? 'login-feedback' : undefined)}
              />
              <p id="login-password-help" className="text-xs text-muted-foreground">
                {isSignUp ? 'Use at least 6 characters.' : 'Enter the password for this account.'}
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

            <Button type="submit" size="lg" className="w-full" disabled={isPending}>
              {authAction === 'email'
                ? isSignUp
                  ? 'Creating account…'
                  : 'Signing in…'
                : isSignUp
                  ? 'Create Account'
                  : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? 'Already lifting with PlateIQ?' : 'Need an account?'}{' '}
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setFeedback(null)
              }}
              disabled={isPending}
              className="h-auto px-0 text-sm font-medium"
            >
              {isSignUp ? 'Sign in' : 'Create one'}
            </Button>
          </p>
        </section>
      </div>
    </div>
  )
}
