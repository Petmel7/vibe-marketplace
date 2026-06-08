import Link from 'next/link'

export default function OperationsMetricCard({
  label,
  value,
  detail,
  href,
}: {
  label: string
  value: string | number
  detail: string
  href?: string
}) {
  const content = (
    <div className="ui-elevated-panel h-full p-5 transition-transform hover:-translate-y-0.5">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-copy-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-copy-strong">{value}</p>
      <p className="mt-2 text-sm text-copy-secondary">{detail}</p>
    </div>
  )

  if (!href) {
    return content
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  )
}

