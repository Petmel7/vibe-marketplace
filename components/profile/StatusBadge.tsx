const STATUS_STYLES: Record<string, string> = {
  pending: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  confirmed: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  paid: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  processing: 'border-indigo-400/30 bg-indigo-400/10 text-indigo-200',
  shipped: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
  delivered: 'border-brand-success/30 bg-brand-success/10 text-brand-success',
  cancelled: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  refunded: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
}

function humanizeStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLES[status] ?? 'border-panelBorder bg-panel text-copy-primary'}`}
    >
      {humanizeStatus(status)}
    </span>
  )
}
