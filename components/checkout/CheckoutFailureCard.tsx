'use client'

import Link from 'next/link'
import DashboardCard from '@/components/profile/DashboardCard'
import type { CheckoutOrderDetail } from '@/types/orders'
import { formatPrice } from '@/utils/formatters/price'
import PaymentMethodBadge from './PaymentMethodBadge'
import PaymentStatusBadge from './PaymentStatusBadge'

function getItemCount(order: CheckoutOrderDetail) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}

export default function CheckoutFailureCard({
  order,
}: {
  order: CheckoutOrderDetail
}) {
  return (
    <DashboardCard
      title="Оплату не підтверджено"
      description="Ми не отримали успішного підтвердження від платіжного провайдера. Замовлення збережене, але оплата не завершена."
      action={<PaymentStatusBadge status={order.paymentStatus} />}
    >
      <div className="space-y-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
            <dt className="text-sm text-copy-muted">Номер замовлення</dt>
            <dd className="mt-1 text-base font-semibold text-copy-strong">#{order.id.slice(0, 8)}</dd>
          </div>
          <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
            <dt className="text-sm text-copy-muted">Сума</dt>
            <dd className="mt-1 text-base font-semibold text-copy-strong">{formatPrice(order.totalAmount)}</dd>
          </div>
          <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
            <dt className="text-sm text-copy-muted">Товарів</dt>
            <dd className="mt-1 text-base font-semibold text-copy-strong">{getItemCount(order)}</dd>
          </div>
          <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
            <dt className="text-sm text-copy-muted">Спосіб оплати</dt>
            <dd className="mt-2">
              <PaymentMethodBadge method={order.paymentMethod} />
            </dd>
          </div>
        </dl>

        <div className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-4 text-sm text-copy-primary">
          Перевірте деталі замовлення у своєму кабінеті. Якщо потрібно, спробуйте оформити нове замовлення або зв’яжіться з підтримкою.
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={`/profile/orders/${order.id}`} className="ui-primary-button">
            Перейти до замовлення
          </Link>
          <Link href="/profile/orders" className="ui-secondary-button">
            Усі замовлення
          </Link>
        </div>
      </div>
    </DashboardCard>
  )
}
