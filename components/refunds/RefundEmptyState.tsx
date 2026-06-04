import Link from 'next/link'

export default function RefundEmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-panelBorder bg-panelAlt/60 px-6 py-10 text-center">
      <h2 className="text-lg font-semibold text-copy-strong">{title}</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-copy-muted">{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="ui-secondary-button mt-5 inline-flex">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}
