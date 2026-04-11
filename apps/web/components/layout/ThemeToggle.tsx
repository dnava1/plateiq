'use client'

import { useUiStore } from '@/store/uiStore'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Moon, Monitor, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  compact?: boolean
  className?: string
}

export function ThemeToggle({ compact = false, className }: ThemeToggleProps) {
  const { theme, setTheme } = useUiStore()

  return (
    <ToggleGroup
      value={[theme]}
      role="radiogroup"
      aria-label="Theme"
      onValueChange={(values) => {
        const next = values[0]
        if (next === 'light' || next === 'dark' || next === 'system') {
          setTheme(next)
        }
      }}
      variant="outline"
      spacing={0}
      className={cn(className)}
    >
      <ToggleGroupItem
        value="light"
        size={compact ? 'sm' : 'default'}
        role="radio"
        aria-checked={theme === 'light'}
        aria-label="Light theme"
      >
        <Sun />
        {!compact && <span>Light</span>}
      </ToggleGroupItem>
      <ToggleGroupItem
        value="system"
        size={compact ? 'sm' : 'default'}
        role="radio"
        aria-checked={theme === 'system'}
        aria-label="System theme"
      >
        <Monitor />
        {!compact && <span>System</span>}
      </ToggleGroupItem>
      <ToggleGroupItem
        value="dark"
        size={compact ? 'sm' : 'default'}
        role="radio"
        aria-checked={theme === 'dark'}
        aria-label="Dark theme"
      >
        <Moon />
        {!compact && <span>Dark</span>}
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
