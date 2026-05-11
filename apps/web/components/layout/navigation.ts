import {
  BarChart3,
  Clipboard,
  LayoutDashboard,
  Settings,
  Timer,
  type LucideIcon,
} from 'lucide-react'

export type AppNavHref = '/dashboard' | '/analytics' | '/workouts' | '/programs' | '/settings'
export type StartupPrefetchHref = '/launch' | '/gym'
export type AppPrefetchHref = AppNavHref | StartupPrefetchHref

export interface AppNavItem {
  href: AppNavHref
  label: string
  icon: LucideIcon
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/workouts', label: 'Workouts', icon: Timer },
  { href: '/programs', label: 'Programs', icon: Clipboard },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const APP_NAV_PREFETCH_PRIORITY: Record<AppNavHref, readonly AppNavHref[]> = {
  '/dashboard': ['/workouts', '/analytics', '/programs', '/settings'],
  '/analytics': ['/dashboard', '/workouts', '/programs', '/settings'],
  '/workouts': ['/dashboard', '/analytics', '/programs', '/settings'],
  '/programs': ['/workouts', '/dashboard', '/analytics', '/settings'],
  '/settings': ['/dashboard', '/workouts', '/analytics', '/programs'],
}

const STARTUP_ROUTE_PREFETCH_HREFS: readonly StartupPrefetchHref[] = ['/launch', '/gym']

function isKnownAppNavHref(value: string): value is AppNavHref {
  return value in APP_NAV_PREFETCH_PRIORITY
}

export function isActiveNavPath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function getAppNavHref(pathname: string): AppNavHref {
  const matchedHref = APP_NAV_ITEMS.find((item) => isActiveNavPath(pathname, item.href))?.href

  if (matchedHref && isKnownAppNavHref(matchedHref)) {
    return matchedHref
  }

  return '/dashboard'
}

export function getInactiveNavPrefetchHrefs(pathname: string) {
  const activeHref = getAppNavHref(pathname)

  return APP_NAV_PREFETCH_PRIORITY[activeHref].filter((href) => !isActiveNavPath(pathname, href))
}

export function getBackgroundPrefetchHrefs(pathname: string): readonly AppPrefetchHref[] {
  return [...STARTUP_ROUTE_PREFETCH_HREFS, ...getInactiveNavPrefetchHrefs(pathname)]
}

export function getTapNavPrefetchHrefs(targetHref: AppNavHref) {
  return [targetHref, ...APP_NAV_PREFETCH_PRIORITY[targetHref].slice(0, 2)]
}

interface AppNavActivationLike {
  button: number
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}

interface AppNavPointerActivationLike extends AppNavActivationLike {
  pointerType: string
}

export function isPlainAppNavActivation(event: AppNavActivationLike) {
  return event.button === 0
    && !event.altKey
    && !event.ctrlKey
    && !event.metaKey
    && !event.shiftKey
}

export function shouldCommitAppNavOnPointerDown(event: AppNavPointerActivationLike) {
  return isPlainAppNavActivation(event) && event.pointerType !== 'mouse'
}
