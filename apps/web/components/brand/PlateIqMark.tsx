import Image from 'next/image'
import { cn } from '@/lib/utils'

interface PlateIqMarkProps {
  className?: string
}

export function PlateIqMark({ className }: PlateIqMarkProps) {
  return (
    <span aria-hidden="true" className={cn('inline-flex shrink-0 items-center justify-center', className)}>
      <Image
        src="/icons/plateiq-mark-light.svg"
        alt=""
        width={256}
        height={256}
        className="block size-full object-contain dark:hidden"
        draggable={false}
      />
      <Image
        src="/icons/plateiq-mark-dark.svg"
        alt=""
        width={256}
        height={256}
        className="hidden size-full object-contain dark:block"
        draggable={false}
      />
    </span>
  )
}
