import AdminMetricCard from '@/components/admin/AdminMetricCard'
import { formatMoneyAmount } from '@/types/payouts'
import type { SellerFinanceSummary } from '@/types/payouts'

export default function SellerFinanceSummaryCards({ summary }: { summary: SellerFinanceSummary }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <AdminMetricCard
        label="Pending"
        value={formatMoneyAmount(summary.pendingAmount, summary.currency)}
        detail="Кошти утримуються до дати availableAt перед переходом у доступний баланс."
      />
      <AdminMetricCard
        label="Available"
        value={formatMoneyAmount(summary.availableAmount, summary.currency)}
        detail="Доступний баланс може бути включений у ручну виплату адміністратора."
      />
      <AdminMetricCard
        label="Paid out"
        value={formatMoneyAmount(summary.paidOutAmount, summary.currency)}
        detail="Це сума, яку маркетплейс уже відмітив як виплачену продавцю."
      />
    </div>
  )
}
