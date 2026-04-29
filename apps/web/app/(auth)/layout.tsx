import { LegalLinks } from '@/components/layout/LegalLinks'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="auth-shell">
      <div className="pointer-events-none absolute left-1/2 top-0 size-136 -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-40 size-96 rounded-full bg-secondary blur-3xl" />
      <div className="relative flex w-full max-w-5xl flex-col gap-6">
        {children}

        <div className="mx-auto flex w-full max-w-xl justify-center px-2 text-center">
          <LegalLinks className="justify-center" />
        </div>
      </div>
    </main>
  )
}
