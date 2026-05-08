import { Loader2 } from 'lucide-react'
import { PlateIqMark } from '@/components/brand/PlateIqMark'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="page-shell max-w-6xl">
      <section
        className="surface-panel flex items-center gap-4 p-5 sm:p-6"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex size-14 items-center justify-center rounded-[24px] border border-border/70 bg-muted/60 shadow-inner shadow-black/5 dark:shadow-white/5">
          <PlateIqMark className="size-8" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            <span className="eyebrow">PlateIQ</span>
          </div>
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
            Opening PlateIQ
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-[0.95rem]">
            Restoring your training data and reconnecting your latest workout state.
          </p>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start" aria-hidden="true">
        <div className="flex flex-col gap-4">
          <div className="surface-panel flex flex-col gap-4 p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="surface-panel flex flex-col gap-4 p-5">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-9 w-36" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="surface-panel flex flex-col gap-4 p-5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-40 w-full rounded-[24px]" />
        </div>
      </div>
    </div>
  )
}