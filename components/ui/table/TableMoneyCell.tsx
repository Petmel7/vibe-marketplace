import type { ReactNode } from 'react'
import { formatPrice } from '@/utils/formatters/price'
import TableCell from './TableCell'

export default function TableMoneyCell({
  amount,
  children,
  emphasize = false,
}: {
  amount?: number | string | null
  children?: ReactNode
  emphasize?: boolean
}) {
  return (
    <TableCell tone="secondary">
      <span className={emphasize ? 'font-semibold text-copy-strong' : undefined}>
        {children ?? (amount != null ? formatPrice(amount) : '—')}
      </span>
    </TableCell>
  )
}
