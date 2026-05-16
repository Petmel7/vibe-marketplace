import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminProductModerationActions from '@/components/admin/AdminProductModerationActions'
import AdminSection from '@/components/admin/AdminSection'
import AdminSellerModerationActions from '@/components/admin/AdminSellerModerationActions'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import { getCurrentUser } from '@/lib/session/getSession'
import { getAdminProductStatusTone, getAdminSellerStatusTone } from '@/types/admin'
import { getAdminModerationPageData } from '@/app/(protected)/admin/_lib/admin-dashboard.data'

export default async function AdminModerationPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminModerationPageData(user)

  return (
    <AdminSection
      eyebrow="Moderation"
      title="Trust and safety queues"
      description="Review pending seller and product decisions, plus the escalated rejected and suspended items that need administrative follow-up."
    >
      <div className="space-y-6">
        <AdminDataTable
          title="Pending seller approvals"
          description="Approve or reject seller applications before seller tooling becomes available."
        >
          {data.pendingSellerQueue.items.length === 0 ? (
            <div className="p-6">
              <AdminEmptyState
                title="No sellers waiting on approval"
                description="New seller applications will appear here when buyer accounts apply for marketplace access."
              />
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-panel/60 text-left text-copy-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Seller</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.pendingSellerQueue.items.map((seller) => (
                  <tr key={seller.id} className="border-t border-panelBorder align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-copy-strong">{seller.businessName || 'Unnamed seller application'}</p>
                      <p className="mt-1 text-copy-muted">User {seller.userId.slice(0, 8)}</p>
                    </td>
                    <td className="px-5 py-4 text-copy-secondary">{new Date(seller.createdAt).toLocaleDateString('uk-UA')}</td>
                    <td className="px-5 py-4">
                      <AdminStatusBadge label={seller.verificationStatus} tone={getAdminSellerStatusTone(seller.verificationStatus)} />
                    </td>
                    <td className="px-5 py-4">
                      <AdminSellerModerationActions sellerId={seller.id} verificationStatus={seller.verificationStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </AdminDataTable>

        <AdminDataTable
          title="Pending product approvals"
          description="Review catalog items queued for publication."
        >
          {data.pendingProductQueue.items.length === 0 ? (
            <div className="p-6">
              <AdminEmptyState
                title="No products waiting on approval"
                description="Products submitted for review will appear here automatically."
              />
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-panel/60 text-left text-copy-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Store</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.pendingProductQueue.items.map((product) => (
                  <tr key={product.id} className="border-t border-panelBorder align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-copy-strong">{product.name}</p>
                      <p className="mt-1 text-copy-muted">{new Date(product.createdAt).toLocaleDateString('uk-UA')}</p>
                    </td>
                    <td className="px-5 py-4 text-copy-secondary">{product.storeName}</td>
                    <td className="px-5 py-4">
                      <AdminStatusBadge label={product.status} tone={getAdminProductStatusTone(product.status)} />
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

        <div className="grid gap-6 xl:grid-cols-2">
          <AdminDataTable
            title="Rejected products"
            description="Catalog items returned to sellers with moderation feedback."
          >
            {data.rejectedProductQueue.items.length === 0 ? (
              <div className="p-6">
                <AdminEmptyState
                  title="No rejected products"
                  description="Rejected product listings will appear here when moderation feedback has been issued."
                />
              </div>
            ) : (
              <div className="space-y-4 p-5 sm:p-6">
                {data.rejectedProductQueue.items.map((product) => (
                  <div key={product.id} className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-copy-strong">{product.name}</p>
                          <p className="mt-1 text-sm text-copy-muted">{product.storeName}</p>
                        </div>
                        <AdminStatusBadge label={product.status} tone={getAdminProductStatusTone(product.status)} />
                      </div>
                      <p className="text-sm text-copy-secondary">{product.moderationReason || 'No rejection reason available.'}</p>
                      <AdminProductModerationActions productId={product.id} status={product.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminDataTable>

          <AdminDataTable
            title="Suspended sellers"
            description="Seller operators currently blocked from marketplace activity."
          >
            {data.suspendedSellerQueue.items.length === 0 ? (
              <div className="p-6">
                <AdminEmptyState
                  title="No suspended sellers"
                  description="Suspended seller accounts will appear here whenever moderation pauses storefront activity."
                />
              </div>
            ) : (
              <div className="space-y-4 p-5 sm:p-6">
                {data.suspendedSellerQueue.items.map((seller) => (
                  <div key={seller.id} className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-copy-strong">{seller.businessName || 'Unnamed seller'}</p>
                          <p className="mt-1 text-sm text-copy-muted">User {seller.userId.slice(0, 8)}</p>
                        </div>
                        <AdminStatusBadge label={seller.verificationStatus} tone={getAdminSellerStatusTone(seller.verificationStatus)} />
                      </div>
                      <p className="text-sm text-copy-secondary">{seller.moderationReason || 'No suspension reason available.'}</p>
                      <AdminSellerModerationActions sellerId={seller.id} verificationStatus={seller.verificationStatus} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminDataTable>
        </div>
      </div>
    </AdminSection>
  )
}
