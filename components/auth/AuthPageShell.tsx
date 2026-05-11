import type { ReactNode } from 'react'
import Link from 'next/link'

export default function AuthPageShell({
  title,
  description,
  alternateHref,
  alternateLabel,
  alternateCta,
  notice,
  children,
}: {
  title: string
  description: string
  alternateHref: string
  alternateLabel: string
  alternateCta: string
  notice?: string
  children: ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-13rem)] w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="ui-elevated-panel space-y-5 p-6 sm:p-8">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-panelBorder bg-panel px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-copy-muted">
              Marketplace access
            </span>
            <h1 className="ui-heading-page">{title}</h1>
            <p className="ui-body-secondary max-w-xl">{description}</p>
            {notice ? (
              <div className="rounded-2xl border border-brand/25 bg-brand/10 px-4 py-3 text-sm text-copy-primary">
                {notice}
              </div>
            ) : null}
          </div>

          {children}
        </section>

        <aside className="ui-panel flex flex-col justify-between gap-6 p-6 sm:p-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-copy-strong">Why this flow works</h2>
            <ul className="space-y-3 text-sm text-copy-secondary">
              <li>Server-side session hydration keeps navigation and protected routes consistent.</li>
              <li>Role-aware entry points are ready for buyer, seller, and admin dashboards.</li>
              <li>Form actions are prepared for email verification, OAuth, and MFA expansion.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-panelBorder bg-panelMuted p-4">
            <p className="text-sm text-copy-secondary">{alternateLabel}</p>
            <Link href={alternateHref} className="ui-secondary-button mt-4 w-full">
              {alternateCta}
            </Link>
          </div>
        </aside>
      </div>
    </main>
  )
}
