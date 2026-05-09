'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { type MouseEvent, type PointerEvent } from 'react'
import { useAppShellClientState } from '@/components/layout/AppShellClientState'
import { cn } from '@/lib/utils'
import {
  APP_NAV_ITEMS,
  isActiveNavPath,
  isPlainAppNavActivation,
  shouldCommitAppNavOnPointerDown,
  type AppNavHref,
} from '@/components/layout/navigation'

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { pendingNavHref, setPendingNavHref } = useAppShellClientState()
  const activePathname = pendingNavHref ?? pathname

  const prefetchRoute = (href: AppNavHref) => {
    if (!isActiveNavPath(pathname, href)) {
      router.prefetch(href)
    }
  }

  const markPendingRoute = (href: AppNavHref) => {
    if (!isActiveNavPath(pathname, href)) {
      setPendingNavHref(href)
    }
  }

  const handlePointerDown = (href: AppNavHref) => (event: PointerEvent<HTMLAnchorElement>) => {
    prefetchRoute(href)

    if (isActiveNavPath(pathname, href) || !isPlainAppNavActivation(event)) {
      return
    }

    markPendingRoute(href)

    if (!shouldCommitAppNavOnPointerDown(event)) {
      return
    }

    event.preventDefault()
    router.push(href)
  }

  const handleClick = (href: AppNavHref) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isActiveNavPath(pathname, href) && isPlainAppNavActivation(event)) {
      markPendingRoute(href)
    }
  }

  return (
    <nav aria-label="App tabs" className="pb-safe-nav fixed inset-x-0 bottom-0 z-50 md:hidden" data-app-chrome="tabs">
      <div className="app-shell">
        <div className="shadow-app-overlay grid w-full grid-cols-5 gap-1 rounded-[20px] border border-border/70 bg-background/78 p-1 backdrop-blur-xl">
          {APP_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = isActiveNavPath(activePathname, href)
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                aria-current={isActive ? 'page' : undefined}
                onFocus={() => prefetchRoute(href)}
                onPointerEnter={() => prefetchRoute(href)}
                onPointerDown={handlePointerDown(href)}
                onClick={handleClick(href)}
                className={cn(
                  'flex min-w-0 flex-col items-center gap-0.5 rounded-[16px] px-1 py-1.5 text-[0.62rem] font-medium leading-none transition-all',
                  isActive
                    ? 'bg-card text-foreground ring-1 ring-border/70 shadow-sm'
                    : 'text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-[9px] transition-colors',
                    isActive ? 'bg-primary/12 text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="w-full truncate text-center">{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
