import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminProductModerationActions from '@/components/admin/AdminProductModerationActions'
import AdminSection from '@/components/admin/AdminSection'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import PaginationControls from '@/components/admin/PaginationControls'
import SearchInput from '@/components/admin/SearchInput'
import StatusFilter from '@/components/admin/StatusFilter'
import {
  DataTable,
  TableActionCell,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableMetaCell,
  TableMoneyCell,
  TableRow,
  TableStatusCell,
} from '@/components/ui/table'
import { getCurrentUser } from '@/lib/session/getSession'
import { ADMIN_PRODUCT_STATUS_FILTERS, getAdminProductStatusTone } from '@/types/admin'
import { getAdminProductsPageData } from '@/app/(protected)/admin/_lib/admin-dashboard.data'

const PRODUCT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Чернетка',
  PENDING_REVIEW: 'Очікує',
  PUBLISHED: 'Опубліковано',
  REJECTED: 'Відхилено',
  ARCHIVED: 'Архівовано',
}

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
      eyebrow="Товари"
      title="Керування товарами маркетплейсу"
      description="Переглядайте стани товарів у каталозі, контекст власності магазинів і історію модерації в одній операційній таблиці."
    >
      <AdminFilterBar action="/admin/products">
        <SearchInput
          name="search"
          label="Пошук товарів"
          defaultValue={data.filters.search}
          placeholder="Пошук за назвою товару"
        />
        <StatusFilter
          name="status"
          label="Статус товару"
          defaultValue={data.filters.status}
          options={ADMIN_PRODUCT_STATUS_FILTERS.map((status) => ({
            label: PRODUCT_STATUS_LABELS[status] ?? status,
            value: status,
          }))}
        />
        <div className="flex w-full justify-center gap-2 max-[479px]:[&>*]:w-full min-[1281px]:w-auto min-[1281px]:justify-start min-[1281px]:self-end">
          <button type="submit" className="ui-primary-button">Застосувати фільтри</button>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        title="Товари маркетплейсу"
        description="Огляд каталогу з урахуванням стану модерації, власності та історії дій."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="У цьому поданні немає товарів"
              description="Змініть фільтри або пошуковий запит, щоб побачити більше позицій каталогу."
            />
          </div>
        ) : (
          <DataTable>
            <TableHead>
              <tr>
                <TableHeaderCell>Товар</TableHeaderCell>
                <TableHeaderCell>Магазин</TableHeaderCell>
                <TableHeaderCell>Ціна</TableHeaderCell>
                <TableHeaderCell>Статус</TableHeaderCell>
                <TableHeaderCell>Модерація</TableHeaderCell>
                <TableHeaderCell>Дії</TableHeaderCell>
              </tr>
            </TableHead>
            <tbody>
              {data.items.map((product) => (
                <TableRow key={product.id}>
                  <TableMetaCell title={product.name} meta={new Date(product.createdAt).toLocaleDateString('uk-UA')} />
                  <TableCell tone="secondary">{product.storeName}</TableCell>
                  <TableMoneyCell amount={product.price} />
                  <TableStatusCell>
                    <AdminStatusBadge
                      label={PRODUCT_STATUS_LABELS[product.status] ?? product.status}
                      tone={getAdminProductStatusTone(product.status)}
                    />
                  </TableStatusCell>
                  <TableCell tone="secondary">
                    {product.moderationReason ? (
                      <>
                        <p>{product.moderationReason}</p>
                        {product.moderatedAt ? (
                          <p className="mt-1 text-copy-muted">{new Date(product.moderatedAt).toLocaleDateString('uk-UA')}</p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-copy-muted">Немає примітки модерації</p>
                    )}
                  </TableCell>
                  <TableActionCell>
                    <AdminProductModerationActions productId={product.id} status={product.status} />
                  </TableActionCell>
                </TableRow>
              ))}
            </tbody>
          </DataTable>
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
