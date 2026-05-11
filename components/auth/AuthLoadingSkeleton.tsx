export default function AuthLoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl animate-pulse space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="h-5 w-28 rounded-full bg-panel" />
      <div className="h-10 w-64 rounded-xl bg-panel" />
      <div className="h-24 rounded-2xl bg-panel" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-14 rounded-2xl bg-panel" />
        <div className="h-14 rounded-2xl bg-panel" />
      </div>
      <div className="h-14 rounded-full bg-panel" />
    </div>
  )
}
