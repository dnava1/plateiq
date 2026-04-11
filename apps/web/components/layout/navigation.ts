import {
  Clipboard,
  Dumbbell,
  LayoutDashboard,
  Settings,
  Timer,
  type LucideIcon,
} from 'lucide-react'

export interface AppNavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workouts', label: 'Workouts', icon: Timer },
  { href: '/programs', label: 'Programs', icon: Clipboard },
  { href: '/exercises', label: 'Exercises', icon: Dumbbell },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function isActiveNavPath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}