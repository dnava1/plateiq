import { LegalLinks } from '@/components/layout/LegalLinks'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="auth-shell">
      <div className="auth-content">
        {children}

        <div className="mx-auto flex w-full max-w-xl justify-center px-2 text-center">
          <LegalLinks className="justify-center" />
        </div>
      </div>
    </main>
  )
}
