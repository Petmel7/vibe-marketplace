import type { CheckoutBlockingIssue } from '@/types/checkout'

const ISSUE_COPY: Record<CheckoutBlockingIssue['code'], string> = {
  EMPTY_CART: 'Ваш кошик порожній.',
  ADDRESS_REQUIRED: 'Оберіть або додайте адресу доставки перед оформленням замовлення.',
  PRODUCT_UNAVAILABLE: 'Один або кілька товарів зараз недоступні.',
  STOCK_UNAVAILABLE: 'Для деяких товарів більше не вистачає залишку на вибрану кількість.',
  PRICE_CHANGED: 'Сервер зафіксував оновлення цін. Перевірте оновлені підсумки перед продовженням.',
}

export default function CheckoutBlockingIssues({
  issues,
}: {
  issues: CheckoutBlockingIssue[]
}) {
  if (issues.length === 0) {
    return null
  }

  return (
    <section
      className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-4 sm:px-5"
      aria-labelledby="checkout-issues-title"
    >
      <div className="space-y-3">
        <div>
          <h2 id="checkout-issues-title" className="text-sm font-semibold text-copy-strong">
            Потрібна увага до оформлення
          </h2>
          <p className="mt-1 text-sm text-copy-secondary">
            Усуньте проблеми нижче перед оформленням замовлення.
          </p>
        </div>

        <ul className="space-y-2 text-sm text-copy-primary">
          {issues.map((issue, index) => (
            <li key={`${issue.code}-${issue.cartItemId ?? index}`} className="rounded-xl bg-white/50 px-3 py-2">
              <p className="font-medium text-copy-strong">{ISSUE_COPY[issue.code]}</p>
              <p className="mt-1 text-copy-secondary">{issue.message}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
