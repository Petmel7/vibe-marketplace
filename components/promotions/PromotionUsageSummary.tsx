import {
  getPromotionRemainingUses,
  type PromotionSummary,
} from '@/types/promotions'

export default function PromotionUsageSummary({
  promotion,
}: {
  promotion: Pick<PromotionSummary, 'totalUsageCount' | 'usageLimit' | 'usageLimitPerUser'>
}) {
  const remainingUses = getPromotionRemainingUses(promotion)

  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium text-copy-strong">{promotion.totalUsageCount} total uses</p>
      <p className="text-copy-secondary">
        {promotion.usageLimit == null
          ? 'No global usage limit'
          : `${remainingUses ?? 0} remaining of ${promotion.usageLimit}`}
      </p>
      <p className="text-copy-muted">
        {promotion.usageLimitPerUser == null
          ? 'No per-user limit'
          : `${promotion.usageLimitPerUser} use${promotion.usageLimitPerUser === 1 ? '' : 's'} per user`}
      </p>
    </div>
  )
}
