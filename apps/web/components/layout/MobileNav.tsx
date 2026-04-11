'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { APP_NAV_ITEMS, isActiveNavPath } from '@/components/layout/navigation'

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="App tabs" className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1.5 rounded-[28px] border border-border/70 bg-background/78 p-2 shadow-[0_24px_70px_-34px_rgba(0,0,0,0.92)] backdrop-blur-xl">
        {APP_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = isActiveNavPath(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[0.72rem] font-medium transition-all',
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
                <Icon className="h-4 w-4" />
              </span>
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
