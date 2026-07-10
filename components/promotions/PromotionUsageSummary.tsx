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
      <p className="font-medium text-copy-strong">{promotion.totalUsageCount} використання загалом</p>
      <p className="text-copy-secondary">
        {promotion.usageLimit == null
          ? 'Без загального ліміту використань'
          : `Залишилося ${remainingUses ?? 0} із ${promotion.usageLimit}`}
      </p>
      <p className="text-copy-muted">
        {promotion.usageLimitPerUser == null
          ? 'Без ліміту на користувача'
          : `${promotion.usageLimitPerUser} використання на користувача`}
      </p>
    </div>
  )
}
