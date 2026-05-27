import Link from 'next/link'
import DashboardCard from '@/components/profile/DashboardCard'
import type { OrderDetailDto } from '@/features/orders/orders.dto'
import type { PaymentMethod, PaymentNextAction, PaymentStatus } from '@/types/payments'
import PaymentMethodBadge, { getPaymentMethodLabel } from './PaymentMethodBadge'
import PaymentStatusBadge from './PaymentStatusBadge'
import { formatPrice } from '@/utils/formatters/price'

function getItemCount(order: OrderDetailDto) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}

function getPendingMessage(
  nextAction: PaymentNextAction | null | undefined,
  method: PaymentMethod | null | undefined,
) {
  if (method === 'CARD') {
    return 'Замовлення створене, але оплата ще очікує підтвердження від платіжного провайдера або webhook-обробки.'
  }

  if (nextAction === 'AWAITING_MANUAL_CONFIRMATION') {
    return 'Замовлення очікує ручного підтвердження оплати. Ми повідомимо вас, щойно статус зміниться.'
  }

  return 'Замовлення створене. Перевірте сторінку замовлень трохи пізніше, щоб побачити оновлений статус оплати.'
}

export default function CheckoutPendingPaymentCard({
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
  return (
    <DashboardCard
      title="Оплата очікує підтвердження"
      description={getPendingMessage(nextAction, paymentMethod)}
      action={<PaymentStatusBadge status={paymentStatus} />}
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
              <PaymentMethodBadge method={paymentMethod} />
            </dd>
          </div>
        </dl>

        <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
          <h2 className="text-sm font-semibold text-copy-strong">Що далі</h2>
          <ul className="mt-3 space-y-2 text-sm text-copy-secondary">
            <li>Статус оплати оновиться після підтвердження від сервера або платіжного провайдера.</li>
            <li>Замовлення вже доступне у вашому кабінеті покупця.</li>
            <li>
              Якщо ви закрили сторінку оплати раніше, відкрийте деталі замовлення і перевірте статус{' '}
              {getPaymentMethodLabel(paymentMethod).toLowerCase()}.
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={`/profile/orders/${order.id}`} className="ui-primary-button">
            Перейти до замовлення
          </Link>
          <Link href="/profile/orders" className="ui-secondary-button">
            Всі замовлення
          </Link>
        </div>
      </div>
    </DashboardCard>
  )
}
