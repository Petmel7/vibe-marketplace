import { getDisputeStatusLabel, type DisputeStatus } from '@/types/disputes'

export default function DisputeStatusBadge({ status }: { status: DisputeStatus }) {
  const toneClassName =
    status === 'RESOLVED'
      ? 'border-brand-success/25 bg-brand-success/10 text-brand-success'
      : status === 'REJECTED' || status === 'CLOSED'
        ? 'border-panelBorder bg-panelAlt text-copy-secondary'
        : status === 'ESCALATED'
          ? 'border-brand-danger/25 bg-brand-danger/10 text-brand-danger'
          : 'border-brand-accent/25 bg-brand-accent/10 text-brand-accent'

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] ${toneClassName}`}
    >
      {getDisputeStatusLabel(status)}
    </span>
  )
}
