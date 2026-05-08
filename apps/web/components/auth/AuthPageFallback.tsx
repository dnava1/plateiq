'use client'

import { Loader2 } from 'lucide-react'
import { PlateIqMark } from '@/components/brand/PlateIqMark'

interface AuthPageFallbackProps {
  message?: string
}

export function AuthPageFallback({ message = 'Preparing sign-in' }: AuthPageFallbackProps) {
  return (
    <div className="auth-panel mx-auto w-full max-w-xl animate-scale-in p-6 sm:p-8">
      <section role="status" aria-live="polite" className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <PlateIqMark className="size-14" />
          <div className="flex flex-col gap-1">
            <span className="eyebrow">PlateIQ</span>
            <span className="text-xl font-semibold tracking-normal text-foreground">Sign In</span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/45 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <span>{message}</span>
        </div>
      </section>
    </div>
  )
}
