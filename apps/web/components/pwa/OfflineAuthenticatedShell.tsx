'use client'

import { useEffect, useState, type ComponentType } from 'react'
import ProgramsPage from '@/app/(authenticated)/programs/page'
import SettingsPage from '@/app/(authenticated)/settings/page'
import WorkoutsPage from '@/app/(authenticated)/workouts/page'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'
import { PreferenceSync } from '@/components/layout/PreferenceSync'
import { getAppNavHref, type AppNavHref } from '@/components/layout/navigation'

const OFFLINE_ROUTE_COMPONENTS: Record<AppNavHref, ComponentType> = {
  '/analytics': AnalyticsDashboard,
  '/dashboard': DashboardOverview,
  '/programs': ProgramsPage,
  '/settings': SettingsPage,
  '/workouts': WorkoutsPage,
}

export function OfflineAuthenticatedShell({ initialPath }: { initialPath: string }) {
  const [activePath, setActivePath] = useState<AppNavHref>(() => getAppNavHref(initialPath))

  useEffect(() => {
    setActivePath(getAppNavHref(initialPath))
  }, [initialPath])

  const ActiveRoute = OFFLINE_ROUTE_COMPONENTS[activePath]

  return (
    <div className="authenticated-app-shell" data-authenticated-shell="true" data-offline-shell="true">
      <div className="pointer-events-none absolute -left-16 top-0 size-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-[22%] size-96 rounded-full bg-secondary blur-3xl" />
      <PreferenceSync />
      <div className="authenticated-app-header-slot" data-app-header-slot="true">
        <Header as="div" onNavigate={setActivePath} pathnameOverride={activePath} />
      </div>
      <div
        className="authenticated-app-scroll pb-safe-content relative flex flex-1 flex-col"
        data-app-scroll-region="true"
      >
        <main className="app-shell relative flex flex-1 flex-col pt-0 md:pb-10" data-app-shell-content="true">
          <ActiveRoute />
        </main>
      </div>
      <MobileNav onNavigate={setActivePath} pathnameOverride={activePath} />
    </div>
  )
}