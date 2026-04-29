'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isAnonymousUser } from '@/lib/auth/auth-state'
import { resolveUserDisplayProfile } from '@/lib/auth/user-display'
import { useUser } from '@/hooks/useUser'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Dumbbell } from 'lucide-react'
import { APP_NAV_ITEMS, isActiveNavPath } from '@/components/layout/navigation'

export function Header() {
  const pathname = usePathname()
  const { data: user } = useUser()
  const isGuest = isAnonymousUser(user)
  const { avatarUrl, displayName, initials } = resolveUserDisplayProfile(user, {
    anonymousDisplayName: 'Guest',
  })
  const isSettingsActive = isActiveNavPath(pathname, '/settings')

  return (
    <header className="pt-safe-header sticky top-0 z-50 px-4 md:px-6 md:pt-4">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 rounded-[28px] border border-border/70 bg-background/72 px-3 py-3 shadow-[0_20px_60px_-38px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:gap-3 sm:px-4">
        <Link href="/dashboard" aria-label="Open dashboard" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-primary/12 ring-1 ring-primary/25 sm:size-10">
            <Dumbbell className="text-primary" />
          </span>
          <span className="min-w-0">
            <span className="block whitespace-nowrap text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground sm:text-[0.68rem] sm:tracking-[0.24em]">
              Strength OS
            </span>
            <span className="block truncate text-base font-semibold tracking-[-0.06em] text-foreground sm:text-lg">
              PlateIQ
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="ml-2 hidden items-center gap-1 rounded-full border border-border/70 bg-muted/40 p-1 md:flex">
          {APP_NAV_ITEMS.map((item) => {
            const isActive = isActiveNavPath(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'rounded-full px-3 py-2 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border/70'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {isGuest && (
            <Link
              href="/upgrade"
              className={buttonVariants({
                size: 'sm',
                className: 'hidden rounded-full px-3 sm:inline-flex',
              })}
            >
              Sign In with Google
            </Link>
          )}

          <Link
            href="/settings"
            className={cn(
              'group flex items-center gap-2 rounded-full px-1 py-1 transition-colors',
              isSettingsActive ? 'bg-muted/50 ring-1 ring-border/70' : 'hover:bg-muted/40'
            )}
            aria-label="Open settings"
            title="Open settings"
          >
            <div className="hidden flex-col items-end lg:flex">
              <span className="max-w-32 truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                {displayName}
              </span>
              <span className="text-xs text-muted-foreground">{isGuest ? 'Guest session' : 'Signed in'}</span>
            </div>

            <Avatar size="lg" className="ring-2 ring-primary/15 transition-all group-hover:ring-primary/35">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  )
}
