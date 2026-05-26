import Link from 'next/link'
import DashboardCard from '@/components/profile/DashboardCard'
import type { OrderDetailDto } from '@/features/orders/orders.dto'
import { formatPrice } from '@/utils/formatters/price'

function getItemCount(order: OrderDetailDto) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}

export default function CheckoutSuccessCard({
  order,
}: {
  order: OrderDetailDto
}) {
  return (
    <DashboardCard
      title="Order created successfully"
      description="The order is now stored in your buyer account and can be tracked from the orders dashboard."
      action={
        <span className="rounded-full border border-brand-success/30 bg-brand-success/10 px-3 py-1 text-xs font-medium text-brand-success">
          {order.status}
        </span>
      }
    >
      <div className="space-y-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
            <dt className="text-sm text-copy-muted">Order number</dt>
            <dd className="mt-1 text-base font-semibold text-copy-strong">#{order.id.slice(0, 8)}</dd>
          </div>
          <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
            <dt className="text-sm text-copy-muted">Total</dt>
            <dd className="mt-1 text-base font-semibold text-copy-strong">{formatPrice(order.totalAmount)}</dd>
          </div>
          <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
            <dt className="text-sm text-copy-muted">Items</dt>
            <dd className="mt-1 text-base font-semibold text-copy-strong">{getItemCount(order)}</dd>
          </div>
          <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
            <dt className="text-sm text-copy-muted">Placed on</dt>
            <dd className="mt-1 text-base font-semibold text-copy-strong">
              {new Date(order.createdAt).toLocaleDateString('uk-UA')}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={`/profile/orders/${order.id}`} className="ui-primary-button">
            View order details
          </Link>
          <Link href="/catalog" className="ui-secondary-button">
            Continue shopping
          </Link>
        </div>
      </div>
    </DashboardCard>
  )
}
