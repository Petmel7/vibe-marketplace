import { formatRefundAmount } from '@/types/refunds'

export default function RefundAmount({
  amount,
  currency,
  emphasize = false,
}: {
  amount: string
  currency: string
  emphasize?: boolean
}) {
  return (
    <span className={emphasize ? 'font-semibold text-copy-strong' : 'text-copy-primary'}>
      {formatRefundAmount(amount, currency)}
    </span>
  )
}
