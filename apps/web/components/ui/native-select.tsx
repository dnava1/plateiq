import * as React from 'react'
import { ChevronsUpDown } from 'lucide-react'

import { cn } from '@/lib/utils'

interface NativeSelectProps extends React.ComponentProps<'select'> {
  wrapperClassName?: string
}

function NativeSelect({ className, wrapperClassName, children, ...props }: NativeSelectProps) {
  return (
    <div className={cn('group relative w-full', wrapperClassName)}>
      <select
        data-slot="native-select"
        className={cn(
          'h-8 w-full appearance-none rounded-[18px] border border-border/70 bg-card/82 px-3 py-1.5 pr-11 text-sm font-medium text-foreground shadow-[0_18px_40px_-34px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,background-color,box-shadow,color] outline-none hover:border-primary/20 hover:bg-card focus-visible:border-primary/35 focus-visible:ring-4 focus-visible:ring-primary/10 disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-border/50 disabled:bg-muted/60 disabled:text-muted-foreground disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15 dark:bg-card/72 dark:aria-invalid:border-destructive/70',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-xl border border-border/60 bg-background/88 text-muted-foreground shadow-sm transition-colors group-hover:border-primary/20 group-hover:text-foreground group-focus-within:border-primary/35 group-focus-within:text-primary">
        <ChevronsUpDown aria-hidden="true" className="size-3.5" />
      </span>
    </div>
  )
}

export { NativeSelect }