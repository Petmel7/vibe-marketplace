import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminProductModerationActions from '@/components/admin/AdminProductModerationActions'
import AdminSection from '@/components/admin/AdminSection'
import AdminSellerModerationActions from '@/components/admin/AdminSellerModerationActions'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import {
  DataTable,
  TableActionCell,
  TableCell,
  TableDateCell,
  TableHead,
  TableHeaderCell,
  TableMetaCell,
  TableRow,
  TableStatusCell,
} from '@/components/ui/table'
import { getCurrentUser } from '@/lib/session/getSession'
import {
  getAdminProductStatusLabel,
  getAdminProductStatusTone,
  getAdminSellerStatusLabel,
  getAdminSellerStatusTone,
} from '@/types/admin'
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
            <DataTable>
              <TableHead>
                <tr>
                  <TableHeaderCell>Продавець</TableHeaderCell>
                  <TableHeaderCell>Створено</TableHeaderCell>
                  <TableHeaderCell>Статус</TableHeaderCell>
                  <TableHeaderCell>Дії</TableHeaderCell>
                </tr>
              </TableHead>
              <tbody>
                {data.pendingSellerQueue.items.map((seller) => (
                  <TableRow key={seller.id}>
                    <TableMetaCell
                      title={seller.businessName || 'Заявка продавця без назви'}
                      meta={`Користувач ${seller.userId.slice(0, 8)}`}
                    />
                    <TableDateCell value={seller.createdAt} mode="date" />
                    <TableStatusCell>
                      <AdminStatusBadge
                        label={getAdminSellerStatusLabel(seller.verificationStatus)}
                        tone={getAdminSellerStatusTone(seller.verificationStatus)}
                      />
                    </TableStatusCell>
                    <TableActionCell>
                      <AdminSellerModerationActions sellerId={seller.id} verificationStatus={seller.verificationStatus} />
                    </TableActionCell>
                  </TableRow>
                ))}
              </tbody>
            </DataTable>
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
            <DataTable>
              <TableHead>
                <tr>
                  <TableHeaderCell>Товар</TableHeaderCell>
                  <TableHeaderCell>Магазин</TableHeaderCell>
                  <TableHeaderCell>Статус</TableHeaderCell>
                  <TableHeaderCell>Дії</TableHeaderCell>
                </tr>
              </TableHead>
              <tbody>
                {data.pendingProductQueue.items.map((product) => (
                  <TableRow key={product.id}>
                    <TableMetaCell title={product.name} meta={new Date(product.createdAt).toLocaleDateString('uk-UA')} />
                    <TableCell tone="secondary">{product.storeName}</TableCell>
                    <TableStatusCell>
                      <AdminStatusBadge
                        label={getAdminProductStatusLabel(product.status)}
                        tone={getAdminProductStatusTone(product.status)}
                      />
                    </TableStatusCell>
                    <TableActionCell>
                      <AdminProductModerationActions productId={product.id} status={product.status} />
                    </TableActionCell>
                  </TableRow>
                ))}
              </tbody>
            </DataTable>
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
                        <AdminStatusBadge
                          label={getAdminProductStatusLabel(product.status)}
                          tone={getAdminProductStatusTone(product.status)}
                        />
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
                        <AdminStatusBadge
                          label={getAdminSellerStatusLabel(seller.verificationStatus)}
                          tone={getAdminSellerStatusTone(seller.verificationStatus)}
                        />
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
