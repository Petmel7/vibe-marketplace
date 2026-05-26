'use client'

import Link from 'next/link'
import { useState } from 'react'
import CartItem from './CartItem'
import StateView, { CART_EMPTY_STATE } from '@/components/ui/StateView'
import { formatPrice } from '@/utils/formatters/price'
import Loading from '@/app/cart/loading'
import CartCheckbox from './CartCheckbox'
import { pluralizeItems } from '@/utils/pluralize'
import { useCart } from './hooks/useCart'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Breadcrumbs } from '../ui/Breadcrumbs'
import { PageTitle } from '../ui/PageTitle'
import DashboardCard from '@/components/profile/DashboardCard'

function CartEmpty() {
  return <StateView {...CART_EMPTY_STATE} />
}

function getCartBlockingIssues(
  items: NonNullable<ReturnType<typeof useCart>['cart']>['items'],
) {
  return items.flatMap((item) => {
    if (item.variant.stock <= 0) {
      return [
        `Товар "${item.variant.product.name}" зараз недоступний. Видаліть його з кошика або дочекайтеся поповнення запасу.`,
      ]
    }

    if (item.quantity > item.variant.stock) {
      return [
        `Товар "${item.variant.product.name}" має лише ${item.variant.stock} шт. у наявності, тому кількість у кошику потрібно зменшити.`,
      ]
    }

    return []
  })
}

export default function CartDrawer() {
  const { isAuthenticated } = useCurrentUser()
  const [promoCode, setPromoCode] = useState('')
  const [agreed, setAgreed] = useState(false)

  const {
    cart,
    isLoading,
    loadingItemIds,
    handleUpdateQuantity,
    handleRemoveItem,
  } = useCart()

  if (isLoading) return <Loading />
  if (!cart || cart.items.length === 0) return <CartEmpty />

  const checkoutHref = isAuthenticated
    ? '/checkout'
    : '/login?notice=auth-required&next=/checkout'

  const blockingIssues = getCartBlockingIssues(cart.items)

  const checkoutDisabled = blockingIssues.length > 0

  return (
    <>
      <Breadcrumbs
        items={[
          {
            label: 'Головна',
            href: '/',
          },
          {
            label: 'Кошик',
          },
        ]}
      />

      <div className="mb-8 space-y-3">
        <PageTitle
          title="Кошик"
          count={cart.itemCount}
          countLabel={pluralizeItems(cart.itemCount)}
        />
        <p className="max-w-3xl text-sm text-copy-muted">
          Перевірте товари, оновіть кількість і перейдіть до безпечного оформлення
          замовлення з серверною перевіркою цін та залишків.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-6">
          {blockingIssues.length > 0 ? (
            <section
              className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-4 sm:px-5"
              aria-labelledby="cart-issues-title"
            >
              <div className="space-y-3">
                <div>
                  <h2 id="cart-issues-title" className="text-sm font-semibold text-copy-strong">
                    Кошик потребує уваги
                  </h2>
                  <p className="mt-1 text-sm text-copy-secondary">
                    Виправте проблеми із залишками перед переходом до оформлення.
                  </p>
                </div>

                <ul className="space-y-2 text-sm text-copy-primary">
                  {blockingIssues.map((issue) => (
                    <li
                      key={issue}
                      className="rounded-xl bg-white/50 px-3 py-2"
                    >
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          <DashboardCard
            title="Товари у кошику"
            description="Усі позиції з актуальними цінами та кількістю перед переходом до checkout."
          >
            <div className="space-y-4">
              {cart.items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemoveItem}
                  isLoading={loadingItemIds.has(item.id)}
                />
              ))}
            </div>
          </DashboardCard>

          <DashboardCard
            title="Промокод"
            description="Якщо у вас є промокод, збережіть його для наступного етапу оформлення."
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="overflow-hidden rounded-full border border-panelBorder bg-panel">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Промокод"
                  className="ui-surface-input-plain h-12 w-full min-w-0 px-5 sm:w-74"
                  aria-label="Промокод"
                />
              </div>
              <p className="text-sm text-copy-muted">
                Знижка буде застосована на етапі оформлення, коли логіка промокодів
                стане доступною.
              </p>
            </div>
          </DashboardCard>
        </div>

        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <DashboardCard
            title="Підсумок замовлення"
            description="Сума в кошику і попередній total перед переходом до checkout."
          >
            <div className="space-y-4">
              <dl className="space-y-3 text-sm text-copy-secondary">
                <div className="flex items-center justify-between gap-4">
                  <dt>Товари</dt>
                  <dd className="text-copy-primary">{cart.itemCount}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>Підсумок товарів</dt>
                  <dd className="text-copy-primary">{formatPrice(cart.totalAmount)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>Доставка</dt>
                  <dd className="text-copy-primary">{formatPrice('0.00')}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-panelBorder pt-3 text-base font-semibold text-copy-strong">
                  <dt>Разом</dt>
                  <dd>{formatPrice(cart.totalAmount)}</dd>
                </div>
              </dl>

              {checkoutDisabled ? (
                <div className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
                  Поки що не можна перейти до оформлення: у кошику є позиції з
                  недоступною кількістю.
                </div>
              ) : null}

              {checkoutDisabled ? (
                <button
                  type="button"
                  disabled
                  className="ui-primary-button w-full cursor-not-allowed opacity-60"
                  aria-disabled="true"
                >
                  Оформити замовлення
                </button>
              ) : (
                <Link href={checkoutHref} className="ui-primary-button block w-full text-center">
                  Оформити замовлення
                </Link>
              )}

              <div className="flex items-start gap-2">
                <CartCheckbox checked={agreed} onChange={setAgreed} />
                <p className="text-[11px] leading-4 text-copy-secondary">
                  Натискаючи на кнопку «Оформити замовлення», ви погоджуєтеся на обробку{' '}
                  <a href="#" className="text-brand hover:underline">
                    персональних даних
                  </a>
                  . На наступному етапі checkout ще раз перевірить ціни, адресу та
                  наявність.
                </p>
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </>
  )
}
