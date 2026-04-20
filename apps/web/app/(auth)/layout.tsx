import { LegalLinks, TRAINING_ADVISORY_COPY } from '@/components/layout/LegalLinks'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute left-1/2 top-0 size-136 -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-40 size-96 rounded-full bg-secondary blur-3xl" />
      <div className="relative flex w-full max-w-5xl flex-col gap-6">
        {children}

        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 px-2 text-center">
          <p className="text-sm leading-6 text-muted-foreground">
            {TRAINING_ADVISORY_COPY}
          </p>
          <LegalLinks className="justify-center" />
        </div>
      </div>
    </main>
  )
}
