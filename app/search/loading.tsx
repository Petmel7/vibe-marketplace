export default function SearchLoading() {
  return (
    <main className="pb-24 pt-4 md:pb-12">
      <section className="space-y-6">
        <div className="space-y-3">
          <div className="h-8 w-48 animate-pulse rounded-full bg-panelAlt" />
          <div className="h-5 w-80 animate-pulse rounded-full bg-panelAlt/80" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="hidden rounded-[28px] border border-panelBorder bg-panel p-5 lg:block">
            <div className="space-y-4">
              <div className="h-5 w-24 animate-pulse rounded-full bg-panelAlt" />
              <div className="h-28 animate-pulse rounded-2xl bg-panelAlt/70" />
              <div className="h-28 animate-pulse rounded-2xl bg-panelAlt/70" />
              <div className="h-28 animate-pulse rounded-2xl bg-panelAlt/70" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 min-[375px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-[420px] animate-pulse rounded-[28px] border border-panelBorder bg-panelAlt/60"
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
