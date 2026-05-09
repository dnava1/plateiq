import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'
import { PreferenceSync } from '@/components/layout/PreferenceSync'
import { AppRoutePrefetcher } from '@/components/layout/AppRoutePrefetcher'
import { MobileShellHeaderController } from '@/components/layout/MobileShellHeaderController'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
      <div className="authenticated-app-header-slot" data-app-header-slot="true">
        <Header />
      </div>
      <div
        className="authenticated-app-scroll pb-safe-content relative flex flex-1 flex-col"
        data-app-scroll-region="true"
      >
        <main className="app-shell relative flex flex-1 flex-col pt-6 md:pb-10 md:pt-8" data-app-shell-content="true">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
