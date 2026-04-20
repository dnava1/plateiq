import {
  BarChart3,
  Clipboard,
  LayoutDashboard,
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
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/workouts', label: 'Workouts', icon: Timer },
  { href: '/programs', label: 'Programs', icon: Clipboard },
]

export function isActiveNavPath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}