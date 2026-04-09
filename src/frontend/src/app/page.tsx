import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-32 text-center">
      <h1 className="text-5xl font-bold tracking-tight text-foreground">
        PlateIQ
      </h1>
      <p className="text-lg text-muted-foreground">
        Your 5/3/1 Training Companion
      </p>
      <Link
        href="/dashboard"
        className="mt-2 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Get Started &rarr;
      </Link>
    </main>
  );
}
