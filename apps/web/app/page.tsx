import Link from 'next/link'
import { ArrowRight, BarChart3, Dumbbell, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl items-center px-4 py-10 md:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="flex flex-col gap-6">
          <Badge variant="outline" className="w-fit rounded-full px-3">
            Built for daily lifting
          </Badge>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/12 ring-1 ring-primary/25">
                <Dumbbell className="text-primary" />
              </div>
              <span className="eyebrow">PlateIQ</span>
            </div>
            <h1 className="text-5xl font-semibold -tracking-widest text-foreground md:text-6xl">
              Know the plan before you touch the bar.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              Track your program, log your lifts, and see what&apos;s next.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/continue" className={buttonVariants({ size: 'lg', className: 'w-full sm:w-auto' })}>
              <ArrowRight data-icon="inline-start" />
              Get Started
            </Link>
            <Link
              href="/programs"
              className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full sm:w-auto' })}
            >
              Browse Programs
            </Link>
          </div>
        </div>

        <div className="grid gap-3">
          <Card className="surface-panel">
            <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <BarChart3 />
                </div>
                <p className="text-sm font-medium">Clear progression</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  See cycle structure, training maxes, and the trend lines that matter from week to week.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Sparkles />
                </div>
                <p className="text-sm font-medium">Built for repeat use</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Quiet visuals, quick program edits, and a layout that stays readable between sessions.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
