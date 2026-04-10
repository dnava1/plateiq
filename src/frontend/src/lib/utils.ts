import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { PreferredUnit } from '@/types/domain'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatWeight(lbs: number, unit: PreferredUnit): string {
  if (unit === 'kg') {
    return `${Math.round(lbs * 0.453592 * 10) / 10} kg`
  }
  return `${Math.round(lbs * 10) / 10} lbs`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function roundToNearest(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest
}
