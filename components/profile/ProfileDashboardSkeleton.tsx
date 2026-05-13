export default function ProfileDashboardSkeleton() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid animate-pulse gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="h-28 rounded-3xl bg-panel" />
          <div className="h-56 rounded-3xl bg-panel" />
          <div className="h-40 rounded-3xl bg-panel" />
        </div>
        <div className="space-y-6">
          <div className="h-28 rounded-3xl bg-panel" />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-56 rounded-3xl bg-panel" />
            <div className="h-56 rounded-3xl bg-panel" />
          </div>
          <div className="h-64 rounded-3xl bg-panel" />
        </div>
      </div>
    </main>
  )
}
