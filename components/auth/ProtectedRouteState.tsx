import Link from 'next/link'

export default function ProtectedRouteState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string
  description: string
  actionHref: string
  actionLabel: string
}) {
  return (
    <div className="ui-elevated-panel mx-auto max-w-3xl p-8">
      <div className="space-y-4">
        <span className="inline-flex rounded-full border border-panelBorder bg-panel px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-copy-muted">
          Стан доступу
        </span>
        <h1 className="ui-heading-page">{title}</h1>
        <p className="ui-body-secondary max-w-2xl">{description}</p>
        <Link href={actionHref} className="ui-primary-button mt-2">
          {actionLabel}
        </Link>
      </div>
    </div>
  )
}
