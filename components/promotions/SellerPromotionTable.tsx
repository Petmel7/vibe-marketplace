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

export default function SellerPromotionTable({
  items,
}: {
  items: PromotionSummary[]
}) {
  return (
    <table className="min-w-full text-sm">
      <thead className="bg-panel/60 text-left text-copy-muted">
        <tr>
          <th className="px-5 py-3 font-medium">Акція</th>
          <th className="px-5 py-3 font-medium">Статус</th>
          <th className="px-5 py-3 font-medium">Тип</th>
          <th className="px-5 py-3 font-medium">Знижка</th>
          <th className="px-5 py-3 font-medium">Використання</th>
          <th className="px-5 py-3 font-medium">Період дії</th>
          <th className="px-5 py-3 font-medium">Відкрити</th>
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
                <p className="mt-1 text-copy-muted">Мін. замовлення {formatPrice(promotion.minOrderAmount)}</p>
              ) : null}
            </td>
            <td className="px-5 py-4">
              <PromotionUsageSummary promotion={promotion} />
            </td>
            <td className="px-5 py-4 text-copy-secondary">
              <p>{new Date(promotion.startsAt).toLocaleString('uk-UA')}</p>
              <p className="mt-1 text-copy-muted">
                {promotion.endsAt ? new Date(promotion.endsAt).toLocaleString('uk-UA') : 'Без дати завершення'}
              </p>
            </td>
            <td className="px-5 py-4">
              <Link href={`/seller/promotions/${promotion.id}`} className="ui-link-muted">
                Переглянути деталі
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
