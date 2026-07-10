import type { ReactNode } from 'react'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { PageTitle } from '@/components/ui/PageTitle'

export default function CheckoutShell({
  children,
  title = 'Оформлення замовлення',
  description = 'Перевірте товари, підтвердьте адресу доставки та оформіть замовлення з валідацією ціни й наявності на сервері.',
  currentLabel = 'Оформлення замовлення',
}: {
  children: ReactNode
  title?: string
  description?: string
  currentLabel?: string
}) {
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Головна', href: '/' },
          { label: 'Кошик', href: '/cart' },
          { label: currentLabel },
        ]}
      />

      <div className="mb-8 space-y-3">
        <PageTitle title={title} />
        <p className="max-w-3xl text-sm text-copy-muted">{description}</p>
      </div>

      {children}
    </>
  )
}
