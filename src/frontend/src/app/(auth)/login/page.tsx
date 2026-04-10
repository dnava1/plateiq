'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ArrowRight, BarChart3, Dumbbell, ShieldCheck, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email for a confirmation link.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        setError(error.message)
      } else {
        window.location.href = '/dashboard'
      }
    }

    setLoading(false)
  }

  return (
    <div className="animate-scale-in overflow-hidden rounded-[32px] border border-border/70 bg-background/82 shadow-[0_36px_110px_-52px_rgba(0,0,0,0.92)] backdrop-blur-xl">
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between gap-8 border-r border-border/70 bg-card/72 p-10 lg:flex">
          <div className="flex flex-col gap-5">
            <Badge variant="outline" className="w-fit rounded-full px-3">
              Minimal strength tracking
            </Badge>
            <div className="flex flex-col gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
                <Dumbbell />
              </div>
              <div className="flex flex-col gap-2">
                <span className="eyebrow">PlateIQ</span>
                <h1 className="text-4xl font-semibold tracking-[-0.08em] text-foreground">
                  Train hard. Keep the interface quiet.
                </h1>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  Built for lifters who want a cleaner view of the work: program structure,
                  progression, and the signals that matter.
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
                  <p className="text-sm font-medium text-foreground">Cleaner progression view</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Programs, training maxes, and cycles without dashboard clutter.
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
                  <p className="text-sm font-medium text-foreground">Purpose-built flow</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Move from template selection to custom building with a tighter experience.
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
                  <p className="text-sm font-medium text-foreground">Sign in and keep training</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Resume your current block, adjust training maxes, and stay synced across sessions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="flex flex-col gap-6 px-6 py-8 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-3">
            <Badge variant="outline" className="w-fit rounded-full px-3 lg:hidden">
              Strength tracking
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
                {isSignUp ? 'Create your account' : 'Sign in'}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Continue your current block, review your training maxes, and build what comes next.
              </p>
            </div>
          </div>

          <Button
            onClick={handleGoogleLogin}
            size="lg"
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
              <span>Continue with Google</span>
            </span>
            <ArrowRight />
          </Button>

          <div className="flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {message && (
              <p className="text-sm text-green-500">{message}</p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
                setMessage(null)
              }}
              className="text-primary underline-offset-4 hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </section>
      </div>
    </div>
  )
}
