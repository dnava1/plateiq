export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute left-1/2 top-0 size-[34rem] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-10rem] right-[-6rem] size-[24rem] rounded-full bg-secondary blur-3xl" />
      <div className="relative w-full max-w-5xl">{children}</div>
    </main>
  )
}
