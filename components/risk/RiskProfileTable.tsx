import Link from 'next/link'
import type { RiskEntityType, RiskProfileListItem } from '@/types/risk'
import { formatRiskScore } from '@/types/risk'
import RiskLevelBadge from '@/components/risk/RiskLevelBadge'

function getProfileName(item: RiskProfileListItem, entityType: RiskEntityType) {
  if (entityType === 'USER') {
    return item.user?.displayName ?? item.user?.name ?? item.user?.email ?? 'Unknown user'
  }

  return item.store?.name ?? 'Unknown store'
}

function getProfileMeta(item: RiskProfileListItem, entityType: RiskEntityType) {
  if (entityType === 'USER') {
    return item.user?.email ?? item.userId ?? 'No email'
  }

  return item.store ? `${item.store.owner.email} · ${item.store.slug}` : item.storeId ?? 'No store data'
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
          <th className="px-5 py-3 font-medium">{entityType === 'USER' ? 'User' : 'Store'}</th>
          <th className="px-5 py-3 font-medium">Risk level</th>
          <th className="px-5 py-3 font-medium">Risk score</th>
          <th className="px-5 py-3 font-medium">Last recalculated</th>
          <th className="px-5 py-3 font-medium">Open</th>
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
              {item.lastCalculatedAt ? new Date(item.lastCalculatedAt).toLocaleString('uk-UA') : 'Not calculated yet'}
            </td>
            <td className="px-5 py-4">
              <Link href={getProfileHref(item, entityType)} className="ui-link-muted">
                View details
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
