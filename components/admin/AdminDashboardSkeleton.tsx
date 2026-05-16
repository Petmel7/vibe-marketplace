export default function AdminDashboardSkeleton() {
  return (
    <main className="ui-section-spacing">
      <div className="grid animate-pulse gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="h-36 rounded-3xl bg-panel" />
          <div className="h-80 rounded-3xl bg-panel" />
        </div>
        <div className="space-y-6">
          <div className="h-40 rounded-3xl bg-panel" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="h-32 rounded-3xl bg-panel" />
            <div className="h-32 rounded-3xl bg-panel" />
            <div className="h-32 rounded-3xl bg-panel" />
            <div className="h-32 rounded-3xl bg-panel" />
          </div>
          <div className="h-80 rounded-3xl bg-panel" />
          <div className="h-96 rounded-3xl bg-panel" />
        </div>
      </div>
    </main>
  )
}
