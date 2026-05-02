'use client'

import {
  MAX_REST_DURATION_SECONDS,
  formatRestDurationInput,
  normalizeRestDurationSeconds,
} from '@/lib/rest-duration'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface RestDurationPickerProps {
  className?: string
  disabled?: boolean
  id: string
  onChange: (seconds: number | null) => void
  ariaLabel?: string
  valueSeconds: number | null | undefined
}

const DURATION_OPTIONS = Array.from({ length: MAX_REST_DURATION_SECONDS + 1 }, (_, index) => index)
const DURATION_ITEMS = DURATION_OPTIONS.map((seconds) => ({
  label: seconds === 0 ? '0:00' : formatRestDurationInput(seconds),
  value: String(seconds),
}))

function clampDuration(totalSeconds: number | null | undefined) {
  const normalizedSeconds = normalizeRestDurationSeconds(totalSeconds) ?? 0

  return Math.min(MAX_REST_DURATION_SECONDS, normalizedSeconds)
}

export function RestDurationPicker({
  ariaLabel = 'Rest duration',
  className,
  disabled = false,
  id,
  onChange,
  valueSeconds,
}: RestDurationPickerProps) {
  const durationSeconds = clampDuration(valueSeconds)

  const updateDuration = (totalSeconds: number) => {
    onChange(totalSeconds > 0 ? totalSeconds : null)
  }

  return (
    <Select
      value={String(durationSeconds)}
      onValueChange={(value) => updateDuration(Number(value))}
      disabled={disabled}
      items={DURATION_ITEMS}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className={cn('h-9 w-full', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        align="start"
        side="bottom"
        collisionAvoidance={{
          align: 'shift',
          fallbackAxisSide: 'none',
          side: 'shift',
        }}
        className="max-h-72"
      >
        <SelectGroup>
          {DURATION_ITEMS.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
