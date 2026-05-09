import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'
import { PreferenceSync } from '@/components/layout/PreferenceSync'
import { AppRoutePrefetcher } from '@/components/layout/AppRoutePrefetcher'
import { MobileShellHeaderController } from '@/components/layout/MobileShellHeaderController'
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
    redirect('/continue')
  }

  return (
    <div className="authenticated-app-shell" data-authenticated-shell="true">
      <div className="pointer-events-none absolute -left-16 top-0 size-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-[22%] size-96 rounded-full bg-secondary blur-3xl" />
      <PreferenceSync />
      <AppRoutePrefetcher />
      <MobileShellHeaderController />
      <div
        className="authenticated-app-scroll pb-safe-content relative flex flex-1 flex-col"
        data-app-scroll-region="true"
      >
        <div className="authenticated-app-header-slot" data-app-header-slot="true">
          <Header />
        </div>
        <main className="app-shell relative flex flex-1 flex-col pt-6 md:pb-10 md:pt-8" data-app-shell-content="true">
          <MissingRouteContent
            description="Use Programs to manage exercises and training max context, or jump into Workouts to resume the current session."
            primaryHref="/programs"
            primaryLabel="Go to Programs"
            secondaryHref="/workouts"
            secondaryLabel="Open Workouts"
          />
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
