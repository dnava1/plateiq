'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Dumbbell } from 'lucide-react'
import { APP_NAV_ITEMS, isActiveNavPath } from '@/components/layout/navigation'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

function getDisplayName(user: ReturnType<typeof useUser>['data']) {
  return user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? 'Athlete'
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'PI'
}

export function Header() {
  const pathname = usePathname()
  const { data: user } = useUser()
  const displayName = getDisplayName(user)
  const initials = getInitials(displayName)
  const isSettingsActive = isActiveNavPath(pathname, '/settings')

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 md:px-6">
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
          <ThemeToggle compact />

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
              <span className="text-xs text-muted-foreground">Signed in</span>
            </div>

            <Avatar size="lg" className="ring-2 ring-primary/15 transition-all group-hover:ring-primary/35">
              {typeof user?.user_metadata?.avatar_url === 'string' && (
                <AvatarImage src={user.user_metadata.avatar_url} alt={displayName} />
              )}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  )
}
