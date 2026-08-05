import Link from 'next/link'
import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import ProductStatusBadge from '@/components/seller/ProductStatusBadge'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import {
  DataTable,
  TableCell,
  TableDateCell,
  TableHead,
  TableHeaderCell,
  TableMoneyCell,
  TableRow,
  TableStatusCell,
} from '@/components/ui/table'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSellerProductsPageData, getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

const FILTERS = [
  { label: 'Усі', value: undefined },
  { label: 'Чернетки', value: 'DRAFT' },
  { label: 'На перевірці', value: 'PENDING_REVIEW' },
  { label: 'Опубліковані', value: 'PUBLISHED' },
  { label: 'Відхилені', value: 'REJECTED' },
  { label: 'Архів', value: 'ARCHIVED' },
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
  const onboardingRedirect = getSellerWorkspaceRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const sellerProfile = data.sellerProfile!

  return (
    <SellerSection
      eyebrow="Товари"
      title="Керування каталогом"
      description="Переглядайте стани модерації, залишки та готовність чернеток по товарах вашої вітрини."
    >
      <SellerVerificationNotice
        status={sellerProfile.verificationStatus}
      />

      <div className="flex flex-col gap-4 max-[1151px]:items-stretch min-[1152px]:flex-row min-[1152px]:items-center min-[1152px]:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const isActive = (status ?? undefined) === filter.value
            const href = filter.value ? `/seller/products?status=${filter.value}` : '/seller/products'

            return (
              <Link
                key={filter.label}
                href={href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${isActive
                    ? 'bg-brand text-white'
                    : 'border border-panelBorder bg-panel text-copy-secondary hover:bg-panelAlt hover:text-copy-strong'
                  }`}
              >
                {filter.label}
              </Link>
            )
          })}
        </div>
        <div className="max-[499px]:w-full min-[501px]:max-[1151px]:flex min-[501px]:max-[1151px]:justify-center">
          <Link href="/seller/products/new" className="ui-primary-button max-[499px]:w-full">
          Новий товар
          </Link>
        </div>
      </div>

      <SellerTable
        title="Товари продавця"
        description="Товари з урахуванням модерації, видимості залишків і швидкими точками входу для редагування."
      >
        {data.products.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="У цьому розділі немає товарів"
              description="Почніть із чернетки товару або перемкніть фільтри, щоб переглянути решту каталогу."
              actionHref="/seller/products/new"
              actionLabel="Створити товар"
            />
          </div>
        ) : (
          <DataTable>
            <TableHead>
              <tr>
                <TableHeaderCell>Товар</TableHeaderCell>
                <TableHeaderCell>Ціна</TableHeaderCell>
                <TableHeaderCell>Залишок</TableHeaderCell>
                <TableHeaderCell>Статус</TableHeaderCell>
                <TableHeaderCell>Оновлено</TableHeaderCell>
              </tr>
            </TableHead>
            <tbody>
              {data.products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Link href={`/seller/products/${product.id}`} className="font-semibold text-copy-strong hover:text-brand">
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableMoneyCell amount={product.price} />
                  <TableCell tone="secondary">
                    <span className={product.totalStock <= 5 ? 'text-amber-200' : 'text-copy-secondary'}>
                      {product.totalStock} шт.
                    </span>
                  </TableCell>
                  <TableStatusCell>
                    <ProductStatusBadge status={product.status} />
                  </TableStatusCell>
                  <TableDateCell value={product.createdAt} mode="date" />
                </TableRow>
              ))}
            </tbody>
          </DataTable>
        )}
      </SellerTable>
    </SellerSection>
  )
}
