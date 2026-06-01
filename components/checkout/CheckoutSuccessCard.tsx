'use client'

import Link from 'next/link'
import DashboardCard from '@/components/profile/DashboardCard'
import type { PaymentNextAction } from '@/types/payments'
import type { CheckoutOrderDetail } from '@/types/orders'
import { formatPrice } from '@/utils/formatters/price'
import PaymentMethodBadge from './PaymentMethodBadge'
import PaymentStatusBadge from './PaymentStatusBadge'

function getItemCount(order: CheckoutOrderDetail) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}

function getOrderStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function CheckoutSuccessCard({
  order,
  nextAction,
}: {
  order: CheckoutOrderDetail
  nextAction: PaymentNextAction | null
}) {
  const isCashOnDelivery = order.paymentMethod === 'CASH_ON_DELIVERY'
  const isCardPayment = order.paymentMethod === 'CARD'

  return (
    <DashboardCard
      title="Замовлення оформлено"
      description={
        isCashOnDelivery
          ? 'Замовлення підтверджене. Оплата буде очікуватися під час отримання, а всі деталі вже збережені у вашому кабінеті покупця.'
          : 'Оплату підтверджено на сервері. Замовлення вже збережене у вашому кабінеті, де можна відстежувати його подальший статус.'
      }
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <PaymentMethodBadge method={order.paymentMethod} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      }
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
            <dt className="text-sm text-copy-muted">Оформлено</dt>
            <dd className="mt-1 text-base font-semibold text-copy-strong">
              {new Date(order.createdAt).toLocaleDateString('uk-UA')}
            </dd>
          </div>
          <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
            <dt className="text-sm text-copy-muted">Спосіб оплати</dt>
            <dd className="mt-2">
              <PaymentMethodBadge method={order.paymentMethod} />
            </dd>
          </div>
          <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
            <dt className="text-sm text-copy-muted">Статус оплати</dt>
            <dd className="mt-2">
              <PaymentStatusBadge status={order.paymentStatus} />
            </dd>
          </div>
          <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
            <dt className="text-sm text-copy-muted">Статус замовлення</dt>
            <dd className="mt-2">
              <span className="inline-flex rounded-full border border-panelBorder bg-panel px-3 py-1 text-xs font-medium text-copy-primary">
                {getOrderStatusLabel(order.status)}
              </span>
            </dd>
          </div>
        </dl>

        <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
          <h2 className="text-sm font-semibold text-copy-strong">Що далі</h2>
          <ul className="mt-3 space-y-2 text-sm text-copy-secondary">
            <li>Замовлення вже збережене у вашому профілі покупця.</li>
            <li>
              {isCashOnDelivery
                ? 'Оплатіть покупку під час отримання від служби доставки або продавця.'
                : 'Стежте за оновленням статусу замовлення у деталях замовлення.'}
            </li>
            {isCardPayment ? (
              <li>Ми показуємо лише підтверджений сервером статус оплати, а не результат повернення з платіжної сторінки.</li>
            ) : null}
            {nextAction === 'AWAITING_CASH_ON_DELIVERY' ? (
              <li>Оплата залишиться в статусі очікування, доки її не буде зафіксовано після вручення.</li>
            ) : null}
          </ul>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={`/profile/orders/${order.id}`} className="ui-primary-button">
            Переглянути замовлення
          </Link>
          <Link href="/catalog" className="ui-secondary-button">
            Продовжити покупки
          </Link>
        </div>
      </div>
    </DashboardCard>
  )
}
