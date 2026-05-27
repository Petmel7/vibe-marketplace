export default function AdminEmailsLoading() {
  return (
    <section className="space-y-5" aria-busy="true">
      <div className="space-y-2">
        <div className="h-3 w-32 animate-pulse rounded bg-panelAlt" />
        <div className="h-8 w-72 animate-pulse rounded bg-panelAlt" />
        <div className="h-4 w-full max-w-3xl animate-pulse rounded bg-panelAlt" />
      </div>

      <div className="ui-elevated-panel p-5">
        <div className="grid gap-4 xl:grid-cols-4">
          <div className="h-20 animate-pulse rounded-2xl bg-panelAlt" />
          <div className="h-20 animate-pulse rounded-2xl bg-panelAlt" />
          <div className="h-20 animate-pulse rounded-2xl bg-panelAlt" />
          <div className="h-20 animate-pulse rounded-2xl bg-panelAlt" />
        </div>
      </div>

      <div className="ui-elevated-panel overflow-hidden">
        <div className="border-b border-panelBorder px-5 py-5">
          <div className="h-5 w-52 animate-pulse rounded bg-panelAlt" />
          <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-panelAlt" />
        </div>
        <div className="space-y-3 p-5">
          <div className="h-14 animate-pulse rounded-2xl bg-panelAlt" />
          <div className="h-14 animate-pulse rounded-2xl bg-panelAlt" />
          <div className="h-14 animate-pulse rounded-2xl bg-panelAlt" />
        </div>
      </div>
    </section>
  )
}
