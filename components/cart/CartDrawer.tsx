'use client'

import Link from 'next/link'
import { useState } from 'react'
import CartItem from './CartItem'
import StateView, { CART_EMPTY_STATE } from '@/components/ui/StateView'
import { formatPrice } from '@/utils/formatters/price'
import { PageContainer } from '@/components/layout/PageContainer'
import Loading from '@/app/cart/loading'
import CartCheckbox from './CartCheckbox'
import { pluralizeItems } from '@/utils/pluralize'
import { useCart } from './hooks/useCart'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Breadcrumbs } from '../ui/Breadcrumbs'
import { PageTitle } from '../ui/PageTitle'

function CartEmpty() {
  return <StateView {...CART_EMPTY_STATE} />
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

  return (
    <PageContainer>
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

      <PageTitle
        title="Кошик"
        count={cart.itemCount}
        countLabel={pluralizeItems(cart.itemCount)}
      />

      <div className="md:flex md:items-start md:gap-8">
        <div className="min-w-0 flex-1">
          <div>
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

          <div className="mt-6 flex flex-col md:flex-row md:items-center md:gap-6">
            <div className="overflow-hidden rounded-full border border-panelBorder bg-panel">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Промокод"
                className="ui-surface-input-plain h-12 w-74"
                aria-label="Промокод"
              />
            </div>
            <p className="ui-body-secondary mt-2 md:hidden">
              Щоб скористатися знижкою введіть промокод
            </p>
          </div>
          <p className="ui-body-secondary hidden md:block">
            Щоб скористатися знижкою введіть промокод
          </p>
        </div>

        <div className="mt-6 md:mt-0 md:w-80 md:shrink-0">
          <div className="md:sticky md:top-24">
            <div className="ui-summary-card">
              <div className="flex items-center justify-between">
                <span className="ui-body-muted">{cart.itemCount} товар на суму</span>
                <span className="text-[13px] leading-5 tabular-nums text-copy-secondary">
                  {formatPrice(cart.totalAmount)}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-panelBorder pb-4">
                <span className="ui-body-muted">Сума зі знижкою</span>
                <span className="text-[13px] leading-5 tabular-nums text-copy-secondary">
                  {formatPrice(cart.totalAmount)}
                </span>
              </div>

              <div className="pt-1">
                <p className="text-[16px] font-bold leading-5 text-copy-primary">Підсумок</p>
                <p className="mt-1 text-[20px] font-medium leading-7 tabular-nums text-brand-accent">
                  {formatPrice(cart.totalAmount)}
                </p>
              </div>

              <Link href={checkoutHref} className="ui-primary-button mt-2 block w-full text-center">
                Оформити замовлення
              </Link>

              <div className="flex items-start gap-2 pt-1">
                <CartCheckbox checked={agreed} onChange={setAgreed} />
                <p className="text-[10px] leading-3 text-copy-secondary">
                  Натискаючи на кнопку «Оформити замовлення», ви погоджуєтеся на обробку{' '}
                  <a href="#" className="text-brand hover:underline">
                    персональних даних
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
