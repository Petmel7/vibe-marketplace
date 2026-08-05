import Link from 'next/link'
import PromotionStatusBadge from './PromotionStatusBadge'
import PromotionUsageSummary from './PromotionUsageSummary'
import { DataTable, TableActionCell, TableCell, TableHead, TableHeaderCell, TableMetaCell, TableRow, TableStatusCell } from '@/components/ui/table'
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
    <DataTable>
      <TableHead>
        <tr>
          <TableHeaderCell>Акція</TableHeaderCell>
          <TableHeaderCell>Статус</TableHeaderCell>
          <TableHeaderCell>Тип</TableHeaderCell>
          <TableHeaderCell>Знижка</TableHeaderCell>
          <TableHeaderCell>Використання</TableHeaderCell>
          <TableHeaderCell>Період дії</TableHeaderCell>
          <TableHeaderCell>Відкрити</TableHeaderCell>
        </tr>
      </TableHead>
      <tbody>
        {items.map((promotion) => (
          <TableRow key={promotion.id}>
            <TableMetaCell title={promotion.code} meta={promotion.name}>
              {promotion.description ? (
                <p className="mt-1 max-w-md text-copy-muted">{promotion.description}</p>
              ) : null}
            </TableMetaCell>
            <TableStatusCell>
              <PromotionStatusBadge promotion={promotion} />
            </TableStatusCell>
            <TableCell tone="secondary">
              <p>{getPromotionTypeLabel(promotion.type)}</p>
              <p className="mt-1 text-copy-muted">{getPromotionDiscountTypeLabel(promotion.discountType)}</p>
            </TableCell>
            <TableCell tone="secondary">
              <p className="font-medium text-copy-strong">{getPromotionDiscountLabel(promotion)}</p>
              {promotion.minOrderAmount ? (
                <p className="mt-1 text-copy-muted">Мін. замовлення {formatPrice(promotion.minOrderAmount)}</p>
              ) : null}
            </TableCell>
            <TableCell>
              <PromotionUsageSummary promotion={promotion} />
            </TableCell>
            <TableCell tone="secondary">
              <p>{new Date(promotion.startsAt).toLocaleString('uk-UA')}</p>
              <p className="mt-1 text-copy-muted">
                {promotion.endsAt ? new Date(promotion.endsAt).toLocaleString('uk-UA') : 'Без дати завершення'}
              </p>
            </TableCell>
            <TableActionCell>
              <Link href={`/admin/promotions/${promotion.id}`} className="ui-link-muted">
                Переглянути деталі
              </Link>
            </TableActionCell>
          </TableRow>
        ))}
      </tbody>
    </DataTable>
  )
}
