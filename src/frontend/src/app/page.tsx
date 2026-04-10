import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-lg">
        <h1 className="text-5xl font-bold tracking-tight">PlateIQ</h1>
        <p className="text-xl text-muted-foreground">
          Your Strength Program Companion
        </p>
        <p className="text-sm text-muted-foreground">
          Track 15+ programs including 5/3/1, Starting Strength, nSuns &amp; more.
          Progress charts, AI insights, and offline gym mode.
        </p>
        <Link
          href="/login"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-lg font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Get Started
        </Link>
      </div>
    </main>
  )
}
