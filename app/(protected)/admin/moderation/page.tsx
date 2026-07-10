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
      eyebrow="Модерація"
      title="Черги довіри та безпеки"
      description="Переглядайте рішення по продавцях і товарах, що очікують схвалення, а також відхилені й призупинені позиції, які потребують адміністративної уваги."
    >
      <div className="space-y-6">
        <AdminDataTable
          title="Продавці, що очікують схвалення"
          description="Схвалюйте або відхиляйте заявки продавців до того, як їм стане доступний seller workspace."
        >
          {data.pendingSellerQueue.items.length === 0 ? (
            <div className="p-6">
              <AdminEmptyState
                title="Немає продавців, які очікують схвалення"
                description="Нові заявки продавців з’являться тут, коли акаунти покупців подадуть запит на доступ до маркетплейсу."
              />
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-panel/60 text-left text-copy-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Продавець</th>
                  <th className="px-5 py-3 font-medium">Створено</th>
                  <th className="px-5 py-3 font-medium">Статус</th>
                  <th className="px-5 py-3 font-medium">Дії</th>
                </tr>
              </thead>
              <tbody>
                {data.pendingSellerQueue.items.map((seller) => (
                  <tr key={seller.id} className="border-t border-panelBorder align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-copy-strong">{seller.businessName || 'Заявка продавця без назви'}</p>
                      <p className="mt-1 text-copy-muted">Користувач {seller.userId.slice(0, 8)}</p>
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
          title="Товари, що очікують схвалення"
          description="Переглядайте позиції каталогу, поставлені в чергу на публікацію."
        >
          {data.pendingProductQueue.items.length === 0 ? (
            <div className="p-6">
              <AdminEmptyState
                title="Немає товарів, які очікують схвалення"
                description="Товари, відправлені на перевірку, автоматично з’являться тут."
              />
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-panel/60 text-left text-copy-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Товар</th>
                  <th className="px-5 py-3 font-medium">Магазин</th>
                  <th className="px-5 py-3 font-medium">Статус</th>
                  <th className="px-5 py-3 font-medium">Дії</th>
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
            title="Відхилені товари"
            description="Позиції каталогу, повернуті продавцям із коментарем модерації."
          >
            {data.rejectedProductQueue.items.length === 0 ? (
              <div className="p-6">
                <AdminEmptyState
                  title="Немає відхилених товарів"
                  description="Відхилені товари з’являться тут, коли модерація видасть відповідний фідбек."
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
                      <p className="text-sm text-copy-secondary">{product.moderationReason || 'Причина відхилення недоступна.'}</p>
                      <AdminProductModerationActions productId={product.id} status={product.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminDataTable>

          <AdminDataTable
            title="Призупинені продавці"
            description="Продавці, яким зараз заблоковано активність на маркетплейсі."
          >
            {data.suspendedSellerQueue.items.length === 0 ? (
              <div className="p-6">
                <AdminEmptyState
                  title="Немає призупинених продавців"
                  description="Призупинені акаунти продавців з’являться тут, коли модерація тимчасово зупинить роботу вітрини."
                />
              </div>
            ) : (
              <div className="space-y-4 p-5 sm:p-6">
                {data.suspendedSellerQueue.items.map((seller) => (
                  <div key={seller.id} className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-copy-strong">{seller.businessName || 'Продавець без назви'}</p>
                          <p className="mt-1 text-sm text-copy-muted">Користувач {seller.userId.slice(0, 8)}</p>
                        </div>
                        <AdminStatusBadge label={seller.verificationStatus} tone={getAdminSellerStatusTone(seller.verificationStatus)} />
                      </div>
                      <p className="text-sm text-copy-secondary">{seller.moderationReason || 'Причина призупинення недоступна.'}</p>
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
