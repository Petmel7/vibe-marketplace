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
    <main className="mx-auto flex min-h-[calc(100vh-13rem)] w-full max-w-6xl items-center">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="ui-elevated-panel space-y-5 p-6 sm:p-8">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-panelBorder bg-panel px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-copy-muted">
              Доступ до маркетплейсу
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
            <h2 className="text-xl font-semibold text-copy-strong">Чому цей сценарій зручний</h2>
            <ul className="space-y-3 text-sm text-copy-secondary">
              <li>Серверна гідратація сесії зберігає навігацію та захищені маршрути узгодженими.</li>
              <li>Точки входу вже готові для ролей покупця, продавця та адміністратора.</li>
              <li>Форми підготовлені до розширення підтвердженням email, OAuth та MFA.</li>
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
