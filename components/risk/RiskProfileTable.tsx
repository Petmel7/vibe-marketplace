import Link from 'next/link'
import RiskLevelBadge from '@/components/risk/RiskLevelBadge'
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
    <table className="min-w-full text-sm">
      <thead className="bg-panel/60 text-left text-copy-muted">
        <tr>
          <th className="px-5 py-3 font-medium">{entityType === 'USER' ? 'Користувач' : 'Магазин'}</th>
          <th className="px-5 py-3 font-medium">Рівень ризику</th>
          <th className="px-5 py-3 font-medium">Оцінка ризику</th>
          <th className="px-5 py-3 font-medium">Востаннє перераховано</th>
          <th className="px-5 py-3 font-medium">Відкрити</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-t border-panelBorder align-top">
            <td className="px-5 py-4">
              <p className="font-semibold text-copy-strong">{getProfileName(item, entityType)}</p>
              <p className="mt-1 text-copy-muted">{getProfileMeta(item, entityType)}</p>
            </td>
            <td className="px-5 py-4">
              <RiskLevelBadge level={item.level} />
            </td>
            <td className="px-5 py-4 text-copy-secondary">{formatRiskScore(item.score)}</td>
            <td className="px-5 py-4 text-copy-secondary">
              {item.lastCalculatedAt ? new Date(item.lastCalculatedAt).toLocaleString('uk-UA') : 'Ще не перераховано'}
            </td>
            <td className="px-5 py-4">
              <Link href={getProfileHref(item, entityType)} className="ui-link-muted">
                Переглянути деталі
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
