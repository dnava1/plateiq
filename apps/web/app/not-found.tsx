import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'
import { PreferenceSync } from '@/components/layout/PreferenceSync'
import { buttonVariants } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

export const dynamic = 'force-dynamic'

function MissingRouteContent({
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  description: string
  primaryHref: string
  primaryLabel: string
  secondaryHref: string
  secondaryLabel: string
}) {
  return (
    <div className="page-shell max-w-3xl">
      <section className="page-header">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Missing Page</span>
          <div className="flex flex-col gap-2">
            <h1 className="page-title">404</h1>
            <p className="page-copy">This page could not be found.</p>
          </div>
        </div>
      </section>

      <Empty className="surface-panel border-border/70 bg-card/72 py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>That route is no longer part of PlateIQ</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="sm:flex-row sm:justify-center">
          <Link href={primaryHref} className={buttonVariants({ variant: 'default' })}>
            {primaryLabel}
          </Link>
          <Link href={secondaryHref} className={buttonVariants({ variant: 'outline' })}>
            {secondaryLabel}
          </Link>
        </EmptyContent>
      </Empty>
    </div>
  )
}

export default async function NotFound() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <MissingRouteContent
        description="Start from Continue to get into PlateIQ, then use Programs or Workouts for active training flows."
        primaryHref="/continue"
        primaryLabel="Continue to PlateIQ"
        secondaryHref="/"
        secondaryLabel="Back to Home"
      />
    )
  }

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div className="pointer-events-none absolute -left-16 top-0 size-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-[22%] size-96 rounded-full bg-secondary blur-3xl" />
      <PreferenceSync />
      <Header />
      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-28 pt-6 md:px-6 md:pb-10 md:pt-8">
        <MissingRouteContent
          description="Use Programs to manage exercises and training max context, or jump into Workouts to resume the current session."
          primaryHref="/programs"
          primaryLabel="Go to Programs"
          secondaryHref="/workouts"
          secondaryLabel="Open Workouts"
        />
      </main>
      <MobileNav />
    </div>
  )
}