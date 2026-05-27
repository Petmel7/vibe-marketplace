import Link from 'next/link'
import DashboardCard from '@/components/profile/DashboardCard'
import type { OrderDetailDto } from '@/features/orders/orders.dto'
import type { PaymentMethod, PaymentNextAction, PaymentStatus } from '@/types/payments'
import { formatPrice } from '@/utils/formatters/price'
import PaymentMethodBadge from './PaymentMethodBadge'
import PaymentStatusBadge from './PaymentStatusBadge'

function getItemCount(order: OrderDetailDto) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}

export default function CheckoutSuccessCard({
  order,
  paymentMethod,
  paymentStatus,
  nextAction,
}: {
  order: OrderDetailDto
  paymentMethod: PaymentMethod | null
  paymentStatus: PaymentStatus | null
  nextAction: PaymentNextAction | null
}) {
  const isCashOnDelivery = paymentMethod === 'CASH_ON_DELIVERY'

  return (
    <DashboardCard
      title="Замовлення створено"
      description={
        isCashOnDelivery
          ? 'Замовлення підтверджене. Оплата буде очікуватися під час отримання, а всі деталі вже збережені у вашому кабінеті покупця.'
          : 'Замовлення збережене у вашому кабінеті покупця. Далі ви зможете відстежувати його статус і деталі доставки.'
      }
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <PaymentMethodBadge method={paymentMethod} />
          <PaymentStatusBadge status={paymentStatus} />
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
              <PaymentMethodBadge method={paymentMethod} />
            </dd>
          </div>
          <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
            <dt className="text-sm text-copy-muted">Статус оплати</dt>
            <dd className="mt-2">
              <PaymentStatusBadge status={paymentStatus} />
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
                : 'Слідкуйте за оновленням статусу оплати й замовлення у деталях замовлення.'}
            </li>
            {nextAction === 'AWAITING_CASH_ON_DELIVERY' ? (
              <li>Оплата залишиться в статусі очікування, доки не буде зафіксована після вручення.</li>
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
