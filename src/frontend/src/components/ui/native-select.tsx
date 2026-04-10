import * as React from 'react'

import { cn } from '@/lib/utils'

interface NativeSelectProps extends React.ComponentProps<'select'> {
  wrapperClassName?: string
}

function NativeSelect({ className, wrapperClassName, children, ...props }: NativeSelectProps) {
  return (
    <div className={cn('relative w-full', wrapperClassName)}>
      <select
        data-slot="native-select"
        className={cn(
          'h-8 w-full appearance-none rounded-lg border border-input bg-transparent px-2.5 py-1 pr-8 text-base text-foreground transition-colors outline-none hover:bg-input/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
        <svg
          aria-hidden="true"
          width="8"
          height="12"
          viewBox="0 0 8 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M0.5 4.5L4 1.5L7.5 4.5" />
          <path d="M0.5 7.5L4 10.5L7.5 7.5" />
        </svg>
      </span>
    </div>
  )
}

export { NativeSelect }