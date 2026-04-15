'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { Dumbbell } from 'lucide-react'
import { sanitizeNextPath } from '@/lib/auth/auth-state'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FeedbackState = {
  tone: 'error' | 'status'
  message: string
}

export default function CreateAccountPage() {
  const searchParams = useSearchParams()
  const next = sanitizeNextPath(searchParams.get('next'), '/dashboard')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const feedbackRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (feedback) {
      feedbackRef.current?.focus()
    }
  }, [feedback])

  const continueHref = next === '/dashboard' ? '/continue' : `/continue?next=${encodeURIComponent(next)}`
  const loginHref = next === '/dashboard' ? '/login' : `/login?next=${encodeURIComponent(next)}`

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setIsPending(true)
    setFeedback(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })

      if (error) {
        setFeedback({ tone: 'error', message: error.message })
        return
      }

      if (data.session) {
        window.location.assign(next)
        return
      }

      setFeedback({ tone: 'status', message: 'Check your email to confirm your account.' })
    } catch {
      setFeedback({ tone: 'error', message: 'Unable to create your account right now.' })
    } finally {
      setIsPending(false)
    }
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

        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle>Create Account with Email</CardTitle>
            <CardDescription>
              Use email and password, then confirm the link we send you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAccount} className="flex flex-col gap-4" aria-busy={isPending}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="create-account-email">Email</Label>
                <Input
                  id="create-account-email"
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
                <Label htmlFor="create-account-password">Password</Label>
                <Input
                  id="create-account-password"
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
                {isPending ? 'Creating Account…' : 'Create Account'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href={loginHref} className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>

        <Link href={continueHref} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Return to Get Started
        </Link>
      </section>
    </div>
  )
}