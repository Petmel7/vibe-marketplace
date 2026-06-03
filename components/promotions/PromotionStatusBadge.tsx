import {
  getPromotionDisplayStatus,
  getPromotionDisplayStatusLabel,
  type PromotionSummary,
} from '@/types/promotions'

function getTone(status: ReturnType<typeof getPromotionDisplayStatus>) {
  switch (status) {
    case 'ACTIVE':
      return 'border-brand-success/30 bg-brand-success/10 text-copy-strong'
    case 'SCHEDULED':
      return 'border-brand-accent/30 bg-brand-accent/10 text-copy-strong'
    case 'EXPIRED':
      return 'border-panelBorder bg-panelAlt text-copy-secondary'
    case 'DISABLED':
      return 'border-brand-danger/25 bg-brand-danger/10 text-copy-strong'
  }
}

export default function PromotionStatusBadge({
  promotion,
}: {
  promotion: Pick<PromotionSummary, 'isActive' | 'startsAt' | 'endsAt'>
}) {
  const status = getPromotionDisplayStatus(promotion)

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getTone(status)}`}
    >
      {getPromotionDisplayStatusLabel(status)}
    </span>
  )
}
