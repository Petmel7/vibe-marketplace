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
          <th className="px-5 py-3 font-medium">Правило</th>
          <th className="px-5 py-3 font-medium">Статус</th>
          <th className="px-5 py-3 font-medium">Область дії</th>
          <th className="px-5 py-3 font-medium">Ставка</th>
          <th className="px-5 py-3 font-medium">Період дії</th>
          <th className="px-5 py-3 font-medium">Відкрити</th>
        </tr>
      </thead>
      <tbody>
        {items.map((rule) => (
          <tr key={rule.id} className="border-t border-panelBorder align-top">
            <td className="px-5 py-4">
              <p className="font-semibold text-copy-strong">{rule.name}</p>
              <p className="mt-1 text-copy-secondary">{getCommissionRuleSpecificityLabel(rule)}</p>
              <p className="mt-1 text-copy-muted">Пріоритет {rule.priority}</p>
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
              <p className="mt-1 text-copy-muted">{Number(rule.rate) * 100}% комісії</p>
            </td>
            <td className="px-5 py-4 text-copy-secondary">
              <p>{new Date(rule.startsAt).toLocaleString('uk-UA')}</p>
              <p className="mt-1 text-copy-muted">
                {rule.endsAt ? new Date(rule.endsAt).toLocaleString('uk-UA') : 'Без завершення'}
              </p>
            </td>
            <td className="px-5 py-4">
              <Link href={`/admin/commission-rules/${rule.id}`} className="ui-link-muted">
                Переглянути деталі
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
