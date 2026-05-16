import Link from 'next/link'
import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import ProductStatusBadge from '@/components/seller/ProductStatusBadge'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getCurrentUser } from '@/lib/session/getSession'
import { formatPrice } from '@/utils/formatters/price'
import { getSellerProductsPageData } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

const FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Drafts', value: 'DRAFT' },
  { label: 'Pending review', value: 'PENDING_REVIEW' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Archived', value: 'ARCHIVED' },
] as const

export default async function SellerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const { status } = await searchParams
  const data = await getSellerProductsPageData(user, { status, page: 1, limit: 20 })

  if (!data.sellerProfile) {
    redirect('/seller/store?setup=profile')
  }

  if (!data.store) {
    redirect('/seller/store?setup=store')
  }

  return (
    <SellerSection
      eyebrow="Products"
      title="Catalog management"
      description="Review moderation states, inventory health, and draft readiness across your storefront products."
    >
      <SellerVerificationNotice
        status={data.sellerProfile.verificationStatus}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const isActive = (status ?? undefined) === filter.value
            const href = filter.value ? `/seller/products?status=${filter.value}` : '/seller/products'

            return (
              <Link
                key={filter.label}
                href={href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand text-white'
                    : 'border border-panelBorder bg-panel text-copy-secondary hover:bg-panelAlt hover:text-copy-strong'
                }`}
              >
                {filter.label}
              </Link>
            )
          })}
        </div>
        <Link href="/seller/products/new" className="ui-primary-button">
          New product
        </Link>
      </div>

      <SellerTable
        title="Seller products"
        description="Moderation-aware product records with inventory visibility and edit entry points."
      >
        {data.products.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No products in this view"
              description="Start with a draft product or switch filters to explore the rest of your catalog."
              actionHref="/seller/products/new"
              actionLabel="Create product"
            />
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-panel/60 text-left text-copy-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Inventory</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((product) => (
                <tr key={product.id} className="border-t border-panelBorder align-top">
                  <td className="px-5 py-4">
                    <Link href={`/seller/products/${product.id}`} className="font-semibold text-copy-strong hover:text-brand">
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">{formatPrice(product.price)}</td>
                  <td className="px-5 py-4 text-copy-secondary">
                    <span className={product.totalStock <= 5 ? 'text-amber-200' : 'text-copy-secondary'}>
                      {product.totalStock} units
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <ProductStatusBadge status={product.status} />
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">
                    {new Date(product.createdAt).toLocaleDateString('uk-UA')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SellerTable>
    </SellerSection>
  )
}
