'use client'

import Link from 'next/link'
import DashboardCard from '@/components/profile/DashboardCard'
import type { PaymentNextAction } from '@/types/payments'
import type { CheckoutOrderDetail } from '@/types/orders'
import PaymentMethodBadge, { getPaymentMethodLabel } from './PaymentMethodBadge'
import PaymentStatusBadge from './PaymentStatusBadge'
import { formatPrice } from '@/utils/formatters/price'

function getItemCount(order: CheckoutOrderDetail) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}

function getPendingMessage(
  nextAction: PaymentNextAction | null | undefined,
  method: CheckoutOrderDetail['paymentMethod'],
  isTimedOut: boolean,
) {
  if (isTimedOut) {
    return 'Платіж ще обробляється. Ми не отримали фінальне підтвердження вчасно, але замовлення збережене у вашому кабінеті.'
  }

  if (method === 'CARD') {
    return 'Очікуємо підтвердження платежу від LiqPay і нашого сервера. Статус оновиться автоматично, щойно webhook підтвердить оплату.'
  }

  if (nextAction === 'AWAITING_MANUAL_CONFIRMATION') {
    return 'Замовлення очікує ручного підтвердження оплати. Ми повідомимо вас, щойно статус зміниться.'
  }

  return 'Замовлення створене. Перевірте сторінку замовлень трохи пізніше, щоб побачити оновлений статус оплати.'
}

export default function CheckoutPendingPaymentCard({
  order,
  nextAction,
  isPolling = false,
  isTimedOut = false,
  pollCount = 0,
  pollingError = null,
}: {
  order: CheckoutOrderDetail
  nextAction: PaymentNextAction | null
  isPolling?: boolean
  isTimedOut?: boolean
  pollCount?: number
  pollingError?: string | null
}) {
  return (
    <DashboardCard
      title="Очікуємо підтвердження платежу"
      description={getPendingMessage(nextAction, order.paymentMethod, isTimedOut)}
      action={<PaymentStatusBadge status={order.paymentStatus} />}
    >
      <div className="space-y-6">
        <div
          className="rounded-2xl border border-panelBorder bg-panel px-4 py-4"
          aria-live="polite"
          role="status"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-copy-strong">
                {isTimedOut ? 'Платіж ще обробляється' : 'Ми автоматично перевіряємо статус оплати'}
              </p>
              <p className="mt-1 text-sm text-copy-secondary">
                {isTimedOut
                  ? 'Ви можете повернутися до деталей замовлення і перевірити його трохи пізніше.'
                  : 'Оновлюємо дані кожні кілька секунд і переведемо вас далі, щойно отримаємо підтвердження.'}
              </p>
            </div>
            <span className="inline-flex rounded-full border border-panelBorder bg-panel/70 px-3 py-1 text-xs text-copy-muted">
              {isPolling ? `Перевірка ${Math.max(pollCount, 1)}` : 'Очікування завершено'}
            </span>
          </div>
          {pollingError ? (
            <p className="mt-3 text-sm text-copy-secondary">
              Тимчасово не вдалося оновити статус. Спробуємо ще раз автоматично.
            </p>
          ) : null}
        </div>

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

        <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
          <h2 className="text-sm font-semibold text-copy-strong">Що далі</h2>
          <ul className="mt-3 space-y-2 text-sm text-copy-secondary">
            <li>Статус оплати оновиться після підтвердження від платіжного провайдера та сервера.</li>
            <li>Замовлення вже доступне у вашому кабінеті покупця.</li>
            <li>
              Якщо ви закрили сторінку оплати раніше, відкрийте деталі замовлення і перевірте статус{' '}
              {getPaymentMethodLabel(order.paymentMethod).toLowerCase()}.
            </li>
          </ul>
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
