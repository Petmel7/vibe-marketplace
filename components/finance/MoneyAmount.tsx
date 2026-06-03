import { formatMoneyAmount } from '@/types/payouts'

export default function MoneyAmount({
  amount,
  currency = 'UAH',
  emphasize = false,
  className = '',
}: {
  amount: string
  currency?: string
  emphasize?: boolean
  className?: string
}) {
  return (
    <span className={`${emphasize ? 'font-semibold text-copy-strong' : 'text-copy-secondary'} ${className}`.trim()}>
      {formatMoneyAmount(amount, currency)}
    </span>
  )
}
