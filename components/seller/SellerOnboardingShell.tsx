import type { ReactNode } from 'react'

export default function SellerOnboardingShell({
  eyebrow,
  title,
  description,
  badge,
  aside,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  badge?: ReactNode
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <main className="ui-section-spacing">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_320px] xl:items-start">
        <div className="space-y-6">
          <section className="ui-elevated-panel p-6 sm:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-copy-muted">{eyebrow}</p>
                <h1 className="ui-heading-page">{title}</h1>
                <p className="max-w-3xl text-sm text-copy-secondary">{description}</p>
              </div>
              {badge ? <div className="shrink-0">{badge}</div> : null}
            </div>
          </section>

          {children}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6">
          {aside}
        </aside>
      </div>
    </main>
  )
}
