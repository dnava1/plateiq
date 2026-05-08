import Image from 'next/image'
import { cn } from '@/lib/utils'

interface PlateIqMarkProps {
  className?: string
  preload?: boolean
}

export function PlateIqMark({ className, preload = false }: PlateIqMarkProps) {
  return (
    <span aria-hidden="true" className={cn('inline-flex shrink-0 items-center justify-center', className)}>
      <Image
        src="/icons/plateiq-mark-light.svg"
        alt=""
        width={256}
        height={256}
        className="block size-full object-contain dark:hidden"
        draggable={false}
        preload={preload}
      />
      <Image
        src="/icons/plateiq-mark-dark.svg"
        alt=""
        width={256}
        height={256}
        className="hidden size-full object-contain dark:block"
        draggable={false}
        preload={preload}
      />
    </span>
  )
}
