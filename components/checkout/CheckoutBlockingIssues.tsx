import type { CheckoutBlockingIssueDto } from '@/features/checkout/checkout.dto'

const ISSUE_COPY: Record<CheckoutBlockingIssueDto['code'], string> = {
  EMPTY_CART: 'Your cart is empty.',
  ADDRESS_REQUIRED: 'Select or add a shipping address before placing the order.',
  PRODUCT_UNAVAILABLE: 'One or more products are unavailable right now.',
  STOCK_UNAVAILABLE: 'Some items no longer have enough stock for the requested quantity.',
  PRICE_CHANGED: 'The server detected updated pricing. Review the refreshed totals before continuing.',
}

export default function CheckoutBlockingIssues({
  issues,
}: {
  issues: CheckoutBlockingIssueDto[]
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
            Checkout needs attention
          </h2>
          <p className="mt-1 text-sm text-copy-secondary">
            Resolve the issues below before placing the order.
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
