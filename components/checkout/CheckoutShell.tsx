import type { ReactNode } from 'react'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { PageTitle } from '@/components/ui/PageTitle'

export default function CheckoutShell({
  children,
  title = 'Checkout',
  description = 'Review your items, confirm a shipping address, and place the order using server-validated pricing and inventory.',
  currentLabel = 'Checkout',
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
          { label: 'Home', href: '/' },
          { label: 'Cart', href: '/cart' },
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
