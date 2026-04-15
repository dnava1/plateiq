'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, Dumbbell } from 'lucide-react'
import { sanitizeNextPath } from '@/lib/auth/auth-state'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

type UpgradeAction =
  | 'upgrade-email'
  | 'upgrade-password'
  | 'upgrade-google'
  | null

type FeedbackState = {
  tone: 'error' | 'status'
  message: string
}

export default function UpgradePage() {
  const searchParams = useSearchParams()
  const { data: user, isLoading } = useUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [action, setAction] = useState<UpgradeAction>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const feedbackRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (feedback) {
      feedbackRef.current?.focus()
    }
  }, [feedback])

  const showPasswordStep = searchParams.get('step') === 'password'
  const nextAfterUpgrade = sanitizeNextPath('/settings?upgraded=1', '/settings?upgraded=1')

  const handleEmailUpgrade = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedEmail = email.trim()
    setEmail(trimmedEmail)
    setAction('upgrade-email')
    setFeedback(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser(
        { email: trimmedEmail, password },
        {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextAfterUpgrade)}`,
        },
      )

      if (error) {
        setFeedback({ tone: 'error', message: error.message })
        return
      }

      setFeedback({
        tone: 'status',
        message: 'Check your email to confirm your account.',
      })
    } catch {
      setFeedback({ tone: 'error', message: 'Unable to start account creation by email right now.' })
    } finally {
      setAction(null)
    }
  }

  const handlePasswordUpgrade = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setAction('upgrade-password')
    setFeedback(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setFeedback({ tone: 'error', message: error.message })
        return
      }

      window.location.assign(nextAfterUpgrade)
    } catch {
      setFeedback({ tone: 'error', message: 'Unable to finish creating your account right now.' })
    } finally {
      setAction(null)
    }
  }

  const handleGoogleUpgrade = async () => {
    setAction('upgrade-google')
    setFeedback(null)

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

      setFeedback({ tone: 'status', message: 'Redirecting to Google…' })
    } catch {
      setFeedback({ tone: 'error', message: 'Unable to start account creation with Google right now.' })
      setAction(null)
    }
  }

  const isPending = action !== null
  const emailOnAccount = user?.email?.trim()

  if (isLoading) {
    return (
      <div className="animate-scale-in rounded-[32px] border border-border/70 bg-background/82 p-8 shadow-[0_36px_110px_-52px_rgba(0,0,0,0.92)] backdrop-blur-xl">
        <p className="text-sm text-muted-foreground">Loading account details…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="animate-scale-in rounded-[32px] border border-border/70 bg-background/82 p-8 shadow-[0_36px_110px_-52px_rgba(0,0,0,0.92)] backdrop-blur-xl">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold tracking-[-0.06em] text-foreground">Create Account unavailable</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            You need an active guest session before you can create a permanent account.
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
            <span className="text-xl font-semibold tracking-[-0.06em] text-foreground">Create Account</span>
          </div>
        </div>

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

        {showPasswordStep ? (
          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle>Set your password</CardTitle>
              <CardDescription>
                Use at least 6 characters.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {emailOnAccount ? (
                <div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
                  Verified email: {emailOnAccount}
                </div>
              ) : (
                <div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
                  Verify the email link first, then return here.
                </div>
              )}

              <form onSubmit={handlePasswordUpgrade} className="flex flex-col gap-4" aria-busy={isPending}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="upgrade-password">Password</Label>
                  <Input
                    id="upgrade-password"
                    type="password"
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={6}
                    required
                    disabled={isPending || !emailOnAccount}
                  />
                </div>

                <Button type="submit" size="lg" disabled={isPending || !emailOnAccount}>
                  {action === 'upgrade-password' ? 'Saving password…' : 'Create Account'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/70 bg-card/70">
            <CardContent className="flex flex-col gap-4 pt-6">
              <Button
                type="button"
                onClick={handleGoogleUpgrade}
                size="lg"
                disabled={isPending}
                className="w-full justify-between rounded-2xl border border-border/70 bg-background/60 px-4 text-foreground hover:bg-muted/60"
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
                  <span>{action === 'upgrade-google' ? 'Redirecting to Google…' : 'Continue with Google'}</span>
                </span>
                <ArrowRight />
              </Button>

              <div className="flex items-center gap-4">
                <Separator className="flex-1" />
                <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              <form onSubmit={handleEmailUpgrade} className="flex flex-col gap-4" aria-busy={isPending}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="upgrade-email">Email</Label>
                  <Input
                    id="upgrade-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="upgrade-password-inline">Password</Label>
                  <Input
                    id="upgrade-password-inline"
                    type="password"
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={6}
                    required
                    disabled={isPending}
                  />
                </div>

                <Button type="submit" size="lg" disabled={isPending}>
                  {action === 'upgrade-email' ? 'Sending verification email…' : 'Create Account with Email'}
                </Button>

                <p className="text-xs leading-5 text-muted-foreground">
                  We&apos;ll email a confirmation link.
                </p>

                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        <Link href="/settings" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Return to settings
        </Link>
      </section>
    </div>
  )
}