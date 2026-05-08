import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="page-shell max-w-6xl" aria-hidden="true">
      <section className="page-header">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-11 w-48" />
            <Skeleton className="h-5 w-full max-w-xl" />
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="flex flex-col gap-4">
          <div className="surface-panel flex flex-col gap-4 p-5">
            <Skeleton className="h-6 w-40" />
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