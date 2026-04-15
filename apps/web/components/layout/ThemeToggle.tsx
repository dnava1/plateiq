'use client'

import { useEffect, useState } from 'react'
import { useUiStore } from '@/store/uiStore'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  compact?: boolean
  className?: string
}

function useResolvedTheme() {
  const theme = useUiStore((s) => s.theme)
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (theme === 'system') return systemDark ? 'dark' : 'light'
  return theme
}

export function ThemeToggle({ compact = false, className }: ThemeToggleProps) {
  const { setTheme } = useUiStore()
  const resolved = useResolvedTheme()

  return (
    <ToggleGroup
      value={[resolved]}
      role="radiogroup"
      aria-label="Theme"
      onValueChange={(values) => {
        const next = values[0]
        if (next === 'light' || next === 'dark') {
          setTheme(next)
        }
      }}
      variant="outline"
      spacing={0}
      className={cn(className)}
    >
      <ToggleGroupItem
        value="dark"
        size={compact ? 'sm' : 'default'}
        role="radio"
        aria-checked={resolved === 'dark'}
        aria-label="Dark theme"
      >
        <Moon />
        {!compact && <span>Dark</span>}
      </ToggleGroupItem>
      <ToggleGroupItem
        value="light"
        size={compact ? 'sm' : 'default'}
        role="radio"
        aria-checked={resolved === 'light'}
        aria-label="Light theme"
      >
        <Sun />
        {!compact && <span>Light</span>}
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
