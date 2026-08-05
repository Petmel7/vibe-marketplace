import Link from 'next/link'
import RiskLevelBadge from '@/components/risk/RiskLevelBadge'
import { DataTable, TableActionCell, TableCell, TableDateCell, TableHead, TableHeaderCell, TableMetaCell, TableRow, TableStatusCell } from '@/components/ui/table'
import { formatRiskScore, type RiskEntityType, type RiskProfileListItem } from '@/types/risk'

function getProfileName(item: RiskProfileListItem, entityType: RiskEntityType) {
  if (entityType === 'USER') {
    return item.user?.displayName ?? item.user?.name ?? item.user?.email ?? 'Невідомий користувач'
  }

  return item.store?.name ?? 'Невідомий магазин'
}

function getProfileMeta(item: RiskProfileListItem, entityType: RiskEntityType) {
  if (entityType === 'USER') {
    return item.user?.email ?? item.userId ?? 'Немає email'
  }

  return item.store ? `${item.store.owner.email} · ${item.store.slug}` : item.storeId ?? 'Немає даних магазину'
}

function getProfileHref(item: RiskProfileListItem, entityType: RiskEntityType) {
  const id = entityType === 'USER' ? item.userId : item.storeId
  return id ? `/admin/risk/${entityType === 'USER' ? 'users' : 'stores'}/${id}` : `/admin/risk/${entityType === 'USER' ? 'users' : 'stores'}`
}

export default function RiskProfileTable({
  items,
  entityType,
}: {
  items: RiskProfileListItem[]
  entityType: RiskEntityType
}) {
  return (
    <DataTable>
      <TableHead>
        <tr>
          <TableHeaderCell>{entityType === 'USER' ? 'Користувач' : 'Магазин'}</TableHeaderCell>
          <TableHeaderCell>Рівень ризику</TableHeaderCell>
          <TableHeaderCell>Оцінка ризику</TableHeaderCell>
          <TableHeaderCell>Востаннє перераховано</TableHeaderCell>
          <TableHeaderCell>Відкрити</TableHeaderCell>
        </tr>
      </TableHead>
      <tbody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableMetaCell title={getProfileName(item, entityType)} meta={getProfileMeta(item, entityType)} />
            <TableStatusCell>
              <RiskLevelBadge level={item.level} />
            </TableStatusCell>
            <TableCell tone="secondary">{formatRiskScore(item.score)}</TableCell>
            <TableDateCell value={item.lastCalculatedAt} fallback="Ще не перераховано" />
            <TableActionCell>
              <Link href={getProfileHref(item, entityType)} className="ui-link-muted">
                Переглянути деталі
              </Link>
            </TableActionCell>
          </TableRow>
        ))}
      </tbody>
    </DataTable>
  )
}
