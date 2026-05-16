import Link from 'next/link'

export default function ModerationQueueCard({
  label,
  count,
  description,
  href,
}: {
  label: string
  count: number
  description: string
  href: string
}) {
  return (
    <section className="ui-elevated-panel p-5 sm:p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-copy-strong">{count}</p>
      <p className="mt-3 text-sm text-copy-muted">{description}</p>
      <Link href={href} className="ui-link-muted mt-5 inline-flex">
        Open queue
      </Link>
    </section>
  )
}
