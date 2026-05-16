export default function AdminMetricCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string | number
  detail: string
}) {
  return (
    <section className="ui-elevated-panel p-5 sm:p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-copy-strong">{value}</p>
      <p className="mt-3 text-sm text-copy-muted">{detail}</p>
    </section>
  )
}
