import Link from 'next/link'
import CommissionRuleStatusBadge from '@/components/commissions/CommissionRuleStatusBadge'
import {
  getCommissionRuleScopeLabel,
  getCommissionRuleSpecificityLabel,
  type CommissionRuleSummary,
} from '@/types/commissions'

export default function CommissionRuleTable({
  items,
}: {
  items: CommissionRuleSummary[]
}) {
  return (
    <table className="min-w-full text-sm">
      <thead className="bg-panel/60 text-left text-copy-muted">
        <tr>
          <th className="px-5 py-3 font-medium">Rule</th>
          <th className="px-5 py-3 font-medium">Status</th>
          <th className="px-5 py-3 font-medium">Scope</th>
          <th className="px-5 py-3 font-medium">Rate</th>
          <th className="px-5 py-3 font-medium">Window</th>
          <th className="px-5 py-3 font-medium">Open</th>
        </tr>
      </thead>
      <tbody>
        {items.map((rule) => (
          <tr key={rule.id} className="border-t border-panelBorder align-top">
            <td className="px-5 py-4">
              <p className="font-semibold text-copy-strong">{rule.name}</p>
              <p className="mt-1 text-copy-secondary">{getCommissionRuleSpecificityLabel(rule)}</p>
              <p className="mt-1 text-copy-muted">Priority {rule.priority}</p>
            </td>
            <td className="px-5 py-4">
              <CommissionRuleStatusBadge rule={rule} />
            </td>
            <td className="px-5 py-4 text-copy-secondary">
              <p>{getCommissionRuleScopeLabel(rule.scope)}</p>
              {rule.storeName ? <p className="mt-1 text-copy-muted">{rule.storeName}</p> : null}
              {rule.categoryName ? <p className="mt-1 text-copy-muted">{rule.categoryName}</p> : null}
            </td>
            <td className="px-5 py-4 text-copy-secondary">
              <p className="font-medium text-copy-strong">{rule.rate}</p>
              <p className="mt-1 text-copy-muted">{Number(rule.rate) * 100}% commission</p>
            </td>
            <td className="px-5 py-4 text-copy-secondary">
              <p>{new Date(rule.startsAt).toLocaleString('uk-UA')}</p>
              <p className="mt-1 text-copy-muted">
                {rule.endsAt ? new Date(rule.endsAt).toLocaleString('uk-UA') : 'No expiry'}
              </p>
            </td>
            <td className="px-5 py-4">
              <Link href={`/admin/commission-rules/${rule.id}`} className="ui-link-muted">
                View details
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
