'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Dumbbell, Link2, ShieldCheck } from 'lucide-react'
import { AuthTurnstileGate } from '@/components/auth/AuthTurnstileGate'
import { getCaptchaFeedbackMessage, isCaptchaRejectionError, turnstileSiteKey } from '@/lib/auth/captcha'
import { isAnonymousUser, sanitizeNextPath } from '@/lib/auth/auth-state'
import {
  clearPendingGuestMergeClient,
  finalizePendingGuestMergeClient,
  prepareGuestMergeClient,
} from '@/lib/auth/merge-client'
import { useUser } from '@/hooks/useUser'
import { flushPendingMutations } from '@/lib/query-persistence'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

type UpgradeAction =
  | 'upgrade-email'
  | 'upgrade-password'
  | 'upgrade-google'
  | 'merge-email'
  | 'merge-google'
  | null

type FeedbackState = {
  tone: 'error' | 'status'
  message: string
}

export default function UpgradePage() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { data: user, isLoading } = useUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [existingEmail, setExistingEmail] = useState('')
  const [existingPassword, setExistingPassword] = useState('')
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
  const passwordStepPath = sanitizeNextPath('/upgrade?step=password', '/upgrade?step=password')
  const isGuest = isAnonymousUser(user)

  const ensureMergeCanProceed = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Reconnect before merging so pending guest workout changes can sync first.')
    }

    const pendingMutationCount = await flushPendingMutations(queryClient)

    if (pendingMutationCount > 0) {
      throw new Error('Wait for pending workout changes to finish syncing before merging this guest session.')
    }
  }

  const handleEmailUpgrade = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedEmail = email.trim()
    setEmail(trimmedEmail)
    setAction('upgrade-email')
    setFeedback(null)

    try {
      await clearPendingGuestMergeClient().catch(() => undefined)

      const supabase = createClient()
      const { error } = await supabase.auth.updateUser(
        { email: trimmedEmail },
        {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(passwordStepPath)}`,
        },
      )

      if (error) {
        setFeedback({ tone: 'error', message: error.message })
        return
      }

      setFeedback({
        tone: 'status',
        message: 'Check your email for the verification link, then come back here to finish creating your account.',
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
      await clearPendingGuestMergeClient().catch(() => undefined)

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

  const handleMergeWithPassword = async (
    event: FormEvent<HTMLFormElement>,
    mergeCaptchaToken: string | null,
    invalidateCaptcha: () => void,
  ) => {
    event.preventDefault()

    if (!turnstileSiteKey) {
      setFeedback({ tone: 'error', message: 'Existing-account merges are unavailable until human verification is configured.' })
      return
    }

    if (!mergeCaptchaToken) {
      setFeedback({ tone: 'error', message: 'Complete human verification before signing into the existing account.' })
      return
    }

    const trimmedEmail = existingEmail.trim()
    setExistingEmail(trimmedEmail)
    setAction('merge-email')
    setFeedback(null)

    try {
      await ensureMergeCanProceed()
      await prepareGuestMergeClient(trimmedEmail)

      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: existingPassword,
        options: {
          captchaToken: mergeCaptchaToken,
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
            'Human verification expired or was already used. It has been reset. If Cloudflare asks for another challenge, complete it and retry the merge sign-in.',
          ),
        })
        return
      }

      await finalizePendingGuestMergeClient()

      window.location.assign('/settings?merged=1')
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Unable to merge this guest session right now.',
      })
    } finally {
      setAction(null)
    }
  }

  const handleMergeWithGoogle = async () => {
    const trimmedEmail = existingEmail.trim().toLowerCase()

    if (!trimmedEmail) {
      setFeedback({ tone: 'error', message: 'Enter the email address of the account you want to merge into first.' })
      return
    }

    setExistingEmail(trimmedEmail)
    setAction('merge-google')
    setFeedback(null)

    try {
      await ensureMergeCanProceed()
      await prepareGuestMergeClient(trimmedEmail)

      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?merge=1&next=${encodeURIComponent('/settings?merged=1')}`,
        },
      })

      if (error) {
        setFeedback({ tone: 'error', message: error.message })
        setAction(null)
        return
      }

      setFeedback({ tone: 'status', message: 'Redirecting to Google…' })
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Unable to start the Google merge right now.',
      })
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
            You need an active guest session before you can create a permanent account or merge it into an existing one.
          </p>
          <Link href="/continue" className={buttonVariants({ size: 'lg', className: 'w-full sm:w-auto' })}>
            Return to Get Started
          </Link>
        </div>
      </div>
    )
  }

  if (!showPasswordStep && !isGuest) {
    return (
      <div className="animate-scale-in rounded-[32px] border border-border/70 bg-background/82 p-8 shadow-[0_36px_110px_-52px_rgba(0,0,0,0.92)] backdrop-blur-xl">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold tracking-[-0.06em] text-foreground">Finish this merge from settings</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Guest-only account creation actions are unavailable on a permanent account. Use the merge recovery panel in settings to resume or cancel the pending guest merge safely.
          </p>
          <Link href="/settings?merge=resume" className={buttonVariants({ size: 'lg', className: 'w-full sm:w-auto' })}>
            Return to Settings
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-scale-in overflow-hidden rounded-[32px] border border-border/70 bg-background/82 shadow-[0_36px_110px_-52px_rgba(0,0,0,0.92)] backdrop-blur-xl">
      <div className="grid lg:grid-cols-[1.02fr_0.98fr]">
        <section className="hidden flex-col justify-between gap-8 border-r border-border/70 bg-card/72 p-10 lg:flex">
          <div className="flex flex-col gap-5">
            <Badge variant="outline" className="w-fit rounded-full px-3">
              Secure your progress
            </Badge>
            <div className="flex flex-col gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
                <Dumbbell />
              </div>
              <div className="flex flex-col gap-2">
                <span className="eyebrow">PlateIQ</span>
                <h1 className="text-4xl font-semibold tracking-[-0.08em] text-foreground">
                  {showPasswordStep ? 'Finish creating your account.' : 'Create Account'}
                </h1>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  {showPasswordStep
                    ? 'Your email has been verified. Set a password to finish creating your permanent PlateIQ account.'
                    : 'Create a permanent account or merge into an existing one without losing your saved training data.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <Card size="sm" className="border-border/70 bg-background/60">
              <CardContent className="flex items-start gap-3 pt-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Link2 />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">Keep the history you already logged</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Workouts, cycles, maxes, programs, and preferences move with the account instead of being rebuilt manually.
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
                  <p className="text-sm font-medium text-foreground">Merge stays server-side</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Existing-account merges happen through a privileged server flow so ownership stays aligned with the database rules.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="flex flex-col gap-6 px-6 py-8 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-3">
            <Badge variant="outline" className="w-fit rounded-full px-3 lg:hidden">
              Secure your progress
            </Badge>
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
                <Dumbbell />
              </div>
              <div className="flex flex-col gap-1">
                <span className="eyebrow">PlateIQ</span>
                <span className="text-xl font-semibold tracking-[-0.06em] text-foreground">Create Account</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-semibold tracking-[-0.06em] text-foreground">
                {showPasswordStep ? 'Finish account setup' : 'Create Account'}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                {showPasswordStep
                  ? `Set a password for ${emailOnAccount ?? 'this account'} so you can sign in again later.`
                  : 'Create a permanent account or merge into an existing one while keeping this guest training history.'}
              </p>
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
                  Use at least 6 characters so this account can be signed into directly the next time.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {emailOnAccount ? (
                  <div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
                    Verified email: {emailOnAccount}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
                    Verify the email link first, then return here to finish creating your account.
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
            <>
              <Card className="border-border/70 bg-card/70">
                <CardHeader>
                  <CardTitle>Create a new permanent account</CardTitle>
                  <CardDescription>
                    Keep this guest history on the same user, then sign in later with Google or email.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
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
                      <span>{action === 'upgrade-google' ? 'Redirecting to Google…' : 'Link Google to This Session'}</span>
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

                    <Button type="submit" size="lg" disabled={isPending}>
                      {action === 'upgrade-email' ? 'Sending verification email…' : 'Create Account with Email'}
                    </Button>

                    <p className="text-xs leading-5 text-muted-foreground">
                      We verify the email first, then bring you back here to set a password.
                    </p>
                  </form>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/70">
                <CardHeader>
                  <CardTitle>Merge into an existing PlateIQ account</CardTitle>
                  <CardDescription>
                    Sign in to the account you already use, then move this guest data into it on the server.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="merge-email">Existing account email</Label>
                    <Input
                      id="merge-email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={existingEmail}
                      onChange={(event) => setExistingEmail(event.target.value)}
                      required
                      disabled={isPending}
                    />
                    <p className="text-xs leading-5 text-muted-foreground">
                      Enter the email on the target account first so the merge is bound to the correct user.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={handleMergeWithGoogle}
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
                      <span>{action === 'merge-google' ? 'Redirecting to Google…' : 'Merge into Existing Google Account'}</span>
                    </span>
                    <ArrowRight />
                  </Button>

                  <div className="flex items-center gap-4">
                    <Separator className="flex-1" />
                    <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">or</span>
                    <Separator className="flex-1" />
                  </div>

                  <AuthTurnstileGate
                    action="merge_password_sign_in"
                    actionLabel="password merge sign-in"
                    siteKey={turnstileSiteKey}
                    unavailableText="Existing-account merges are temporarily unavailable while human verification is being configured."
                  >
                    {({ token, canProceed, invalidate, statusId }) => (
                      <form
                        onSubmit={(event) => void handleMergeWithPassword(event, token, invalidate)}
                        className="flex flex-col gap-4"
                        aria-busy={isPending}
                      >
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="merge-password">Password</Label>
                          <Input
                            id="merge-password"
                            type="password"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            value={existingPassword}
                            onChange={(event) => setExistingPassword(event.target.value)}
                            required
                            disabled={isPending}
                          />
                        </div>

                        <Button type="submit" size="lg" disabled={isPending || !canProceed} aria-describedby={statusId}>
                          {action === 'merge-email' ? 'Signing in and merging…' : 'Merge into Existing Account'}
                        </Button>
                      </form>
                    )}
                  </AuthTurnstileGate>
                </CardContent>
              </Card>
            </>
          )}

          <Link href="/settings" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Return to settings
          </Link>
        </section>
      </div>
    </div>
  )
}