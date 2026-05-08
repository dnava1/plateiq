'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { APP_NAV_ITEMS, isActiveNavPath } from '@/components/layout/navigation'

const OPTIMISTIC_ACTIVE_TIMEOUT_MS = 1_200

interface OptimisticNavTarget {
  href: string
  sourcePathname: string
}

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [optimisticTarget, setOptimisticTarget] = useState<OptimisticNavTarget | null>(null)
  const activePathname = optimisticTarget?.sourcePathname === pathname ? optimisticTarget.href : pathname

  const prefetchRoute = (href: string) => {
    if (!isActiveNavPath(pathname, href)) {
      router.prefetch(href)
    }
  }

  const prepareRouteChange = (href: string) => {
    prefetchRoute(href)

    if (!isActiveNavPath(pathname, href)) {
      setOptimisticTarget({ href, sourcePathname: pathname })
    }
  }

  useEffect(() => {
    if (!optimisticTarget) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setOptimisticTarget(null)
    }, OPTIMISTIC_ACTIVE_TIMEOUT_MS)

    return () => window.clearTimeout(timeoutId)
  }, [optimisticTarget])

  return (
    <nav aria-label="App tabs" className="pb-safe-nav fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="app-shell">
        <div className="shadow-app-overlay grid w-full grid-cols-5 gap-1 rounded-[24px] border border-border/70 bg-background/78 p-1.5 backdrop-blur-xl">
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
                onPointerDown={() => prepareRouteChange(href)}
                className={cn(
                  'flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[0.64rem] font-medium leading-none transition-all',
                  isActive
                    ? 'bg-card text-foreground ring-1 ring-border/70 shadow-sm'
                    : 'text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-xl transition-colors',
                    isActive ? 'bg-primary/12 text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="size-4" />
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
