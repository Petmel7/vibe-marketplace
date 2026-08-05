import Link from 'next/link'
import CommissionRuleStatusBadge from '@/components/commissions/CommissionRuleStatusBadge'
import {
  DataTable,
  TableActionCell,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableMetaCell,
  TableRow,
  TableStatusCell,
} from '@/components/ui/table'
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
    <DataTable>
      <TableHead>
        <tr>
          <TableHeaderCell>Правило</TableHeaderCell>
          <TableHeaderCell>Статус</TableHeaderCell>
          <TableHeaderCell>Область дії</TableHeaderCell>
          <TableHeaderCell>Ставка</TableHeaderCell>
          <TableHeaderCell>Період дії</TableHeaderCell>
          <TableHeaderCell>Відкрити</TableHeaderCell>
        </tr>
      </TableHead>
      <tbody>
        {items.map((rule) => (
          <TableRow key={rule.id}>
            <TableMetaCell
              title={rule.name}
              meta={(
                <>
                  <p className="text-copy-secondary">{getCommissionRuleSpecificityLabel(rule)}</p>
                  <p>Пріоритет {rule.priority}</p>
                </>
              )}
            />
            <TableStatusCell>
              <CommissionRuleStatusBadge rule={rule} />
            </TableStatusCell>
            <TableCell tone="secondary">
              <p>{getCommissionRuleScopeLabel(rule.scope)}</p>
              {rule.storeName ? <p className="mt-1 text-copy-muted">{rule.storeName}</p> : null}
              {rule.categoryName ? <p className="mt-1 text-copy-muted">{rule.categoryName}</p> : null}
            </TableCell>
            <TableCell tone="secondary">
              <p className="font-medium text-copy-strong">{rule.rate}</p>
              <p className="mt-1 text-copy-muted">{Number(rule.rate) * 100}% комісії</p>
            </TableCell>
            <TableCell tone="secondary">
              <p>{new Date(rule.startsAt).toLocaleString('uk-UA')}</p>
              <p className="mt-1 text-copy-muted">
                {rule.endsAt ? new Date(rule.endsAt).toLocaleString('uk-UA') : 'Без завершення'}
              </p>
            </TableCell>
            <TableActionCell>
              <Link href={`/admin/commission-rules/${rule.id}`} className="ui-link-muted">
                Переглянути деталі
              </Link>
            </TableActionCell>
          </TableRow>
        ))}
      </tbody>
    </DataTable>
  )
}
