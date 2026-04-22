import Link from 'next/link'
import { cn } from '@/lib/utils'

export function LegalLinks({
  className,
  linkClassName,
}: {
  className?: string
  linkClassName?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground', className)}>
      <Link
        href="/legal"
        className={cn('font-medium underline-offset-4 transition-colors hover:text-foreground hover:underline', linkClassName)}
      >
        Terms &amp; Privacy
      </Link>
    </div>
  )
}