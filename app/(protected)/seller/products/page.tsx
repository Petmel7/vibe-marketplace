import Link from 'next/link'
import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import ProductStatusBadge from '@/components/seller/ProductStatusBadge'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getCurrentUser } from '@/lib/session/getSession'
import { formatPrice } from '@/utils/formatters/price'
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
        <div className="max-[499px]:w-full">
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
          <table className="min-w-full text-sm">
            <thead className="bg-panel/60 text-left text-copy-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Товар</th>
                <th className="px-5 py-3 font-medium">Ціна</th>
                <th className="px-5 py-3 font-medium">Залишок</th>
                <th className="px-5 py-3 font-medium">Статус</th>
                <th className="px-5 py-3 font-medium">Оновлено</th>
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
                      {product.totalStock} шт.
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
