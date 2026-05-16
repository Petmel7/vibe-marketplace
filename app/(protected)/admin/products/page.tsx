import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminProductModerationActions from '@/components/admin/AdminProductModerationActions'
import AdminSection from '@/components/admin/AdminSection'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import PaginationControls from '@/components/admin/PaginationControls'
import SearchInput from '@/components/admin/SearchInput'
import StatusFilter from '@/components/admin/StatusFilter'
import { getCurrentUser } from '@/lib/session/getSession'
import { formatPrice } from '@/utils/formatters/price'
import { ADMIN_PRODUCT_STATUS_FILTERS, getAdminProductStatusTone } from '@/types/admin'
import { getAdminProductsPageData } from '@/app/(protected)/admin/_lib/admin-dashboard.data'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const rawSearchParams = await searchParams
  const data = await getAdminProductsPageData(user, rawSearchParams)

  return (
    <AdminSection
      eyebrow="Products"
      title="Marketplace product oversight"
      description="Review catalog-wide product states, store ownership context, and moderation history from a single operational table."
    >
      <AdminFilterBar action="/admin/products">
        <SearchInput
          name="search"
          label="Search products"
          defaultValue={data.filters.search}
          placeholder="Search product names"
        />
        <StatusFilter
          name="status"
          label="Product status"
          defaultValue={data.filters.status}
          options={ADMIN_PRODUCT_STATUS_FILTERS.map((status) => ({
            label: status.replaceAll('_', ' '),
            value: status,
          }))}
        />
        <div className="flex gap-2 xl:self-end">
          <button type="submit" className="ui-primary-button">Apply filters</button>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        title="Marketplace products"
        description="Catalog-wide visibility across moderation state, ownership, and action history."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No products in this view"
              description="Adjust the filters or search terms to surface more catalog records."
            />
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-panel/60 text-left text-copy-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Store</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Moderation</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((product) => (
                <tr key={product.id} className="border-t border-panelBorder align-top">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-copy-strong">{product.name}</p>
                    <p className="mt-1 text-copy-muted">{new Date(product.createdAt).toLocaleDateString('uk-UA')}</p>
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">{product.storeName}</td>
                  <td className="px-5 py-4 text-copy-secondary">{formatPrice(product.price)}</td>
                  <td className="px-5 py-4">
                    <AdminStatusBadge label={product.status} tone={getAdminProductStatusTone(product.status)} />
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">
                    {product.moderationReason ? (
                      <>
                        <p>{product.moderationReason}</p>
                        {product.moderatedAt ? (
                          <p className="mt-1 text-copy-muted">{new Date(product.moderatedAt).toLocaleDateString('uk-UA')}</p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-copy-muted">No moderation note</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <AdminProductModerationActions productId={product.id} status={product.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminDataTable>

      <PaginationControls
        pathname="/admin/products"
        page={data.page}
        limit={data.limit}
        total={data.total}
        query={{
          search: data.filters.search,
          status: data.filters.status,
          limit: String(data.limit),
        }}
      />
    </AdminSection>
  )
}
