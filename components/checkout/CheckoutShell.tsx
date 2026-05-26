import type { ReactNode } from 'react'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { PageTitle } from '@/components/ui/PageTitle'
import { PageContainer } from '@/components/layout/PageContainer'

export default function CheckoutShell({
  children,
}: {
  children: ReactNode
}) {
  return (
    <PageContainer className="max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Cart', href: '/cart' },
          { label: 'Checkout' },
        ]}
      />

      <div className="mb-8 space-y-3">
        <PageTitle title="Checkout" />
        <p className="max-w-3xl text-sm text-copy-muted">
          Review your items, confirm a shipping address, and place the order using
          server-validated pricing and inventory.
        </p>
      </div>

      {children}
    </PageContainer>
  )
}
