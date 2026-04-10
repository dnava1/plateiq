export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p className="text-lg">Welcome to PlateIQ</p>
        <p className="mt-2 text-sm">
          Your dashboard will show your current program, next workout, and training stats.
        </p>
        <p className="mt-4 text-xs">Coming in Stage 4+</p>
      </div>
    </div>
  )
}
