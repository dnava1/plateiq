import Link from 'next/link'
import { ArrowRight, BarChart3, Dumbbell, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl items-center px-4 py-10 md:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="flex flex-col gap-6">
          <Badge variant="outline" className="w-fit rounded-full px-3">
            Modern strength tracking
          </Badge>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/12 ring-1 ring-primary/25">
                <Dumbbell className="text-primary" />
              </div>
              <span className="eyebrow">PlateIQ</span>
            </div>
            <h1 className="text-5xl font-semibold tracking-[-0.1em] text-foreground md:text-6xl">
              Quiet enough to focus. Sharp enough to train by.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              Build and run strength programs with clearer progression, cleaner analytics,
              and a calmer interface than the usual fitness app noise.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto">
                <ArrowRight data-icon="inline-start" />
                Enter PlateIQ
              </Button>
            </Link>
            <Link href="/programs">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Explore Programs
              </Button>
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
                <p className="text-sm font-medium">Readable progression</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Track cycle structure, training maxes, and the signal that actually matters.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Sparkles />
                </div>
                <p className="text-sm font-medium">Refined interface</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Dark by default, neutral by design, and tuned for repeated daily use.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
