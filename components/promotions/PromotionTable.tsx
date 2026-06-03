import Link from 'next/link'
import PromotionStatusBadge from './PromotionStatusBadge'
import PromotionUsageSummary from './PromotionUsageSummary'
import {
  getPromotionDiscountTypeLabel,
  getPromotionTypeLabel,
  type PromotionSummary,
} from '@/types/promotions'
import { formatPrice } from '@/utils/formatters/price'

function getPromotionDiscountLabel(promotion: PromotionSummary) {
  if (promotion.discountType === 'PERCENTAGE') {
    return `${promotion.discountValue}%`
  }

  return formatPrice(promotion.discountValue)
}

export default function PromotionTable({
  items,
}: {
  items: PromotionSummary[]
}) {
  return (
    <table className="min-w-full text-sm">
      <thead className="bg-panel/60 text-left text-copy-muted">
        <tr>
          <th className="px-5 py-3 font-medium">Promotion</th>
          <th className="px-5 py-3 font-medium">Status</th>
          <th className="px-5 py-3 font-medium">Type</th>
          <th className="px-5 py-3 font-medium">Discount</th>
          <th className="px-5 py-3 font-medium">Usage</th>
          <th className="px-5 py-3 font-medium">Window</th>
          <th className="px-5 py-3 font-medium">Open</th>
        </tr>
      </thead>
      <tbody>
        {items.map((promotion) => (
          <tr key={promotion.id} className="border-t border-panelBorder align-top">
            <td className="px-5 py-4">
              <p className="font-semibold text-copy-strong">{promotion.code}</p>
              <p className="mt-1 text-copy-secondary">{promotion.name}</p>
              {promotion.description ? (
                <p className="mt-1 max-w-md text-copy-muted">{promotion.description}</p>
              ) : null}
            </td>
            <td className="px-5 py-4">
              <PromotionStatusBadge promotion={promotion} />
            </td>
            <td className="px-5 py-4 text-copy-secondary">
              <p>{getPromotionTypeLabel(promotion.type)}</p>
              <p className="mt-1 text-copy-muted">{getPromotionDiscountTypeLabel(promotion.discountType)}</p>
            </td>
            <td className="px-5 py-4 text-copy-secondary">
              <p className="font-medium text-copy-strong">{getPromotionDiscountLabel(promotion)}</p>
              {promotion.minOrderAmount ? (
                <p className="mt-1 text-copy-muted">Min order {formatPrice(promotion.minOrderAmount)}</p>
              ) : null}
            </td>
            <td className="px-5 py-4">
              <PromotionUsageSummary promotion={promotion} />
            </td>
            <td className="px-5 py-4 text-copy-secondary">
              <p>{new Date(promotion.startsAt).toLocaleString('uk-UA')}</p>
              <p className="mt-1 text-copy-muted">
                {promotion.endsAt ? new Date(promotion.endsAt).toLocaleString('uk-UA') : 'No expiry'}
              </p>
            </td>
            <td className="px-5 py-4">
              <Link href={`/admin/promotions/${promotion.id}`} className="ui-link-muted">
                View details
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
