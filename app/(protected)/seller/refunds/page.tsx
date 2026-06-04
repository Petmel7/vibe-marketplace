import { redirect } from 'next/navigation'
import PaginationControls from '@/components/admin/PaginationControls'
import EmptyState from '@/components/profile/EmptyState'
import RefundEmptyState from '@/components/refunds/RefundEmptyState'
import SellerRefundsTable from '@/components/refunds/SellerRefundsTable'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { REFUND_REQUEST_STATUSES, getRefundStatusLabel } from '@/types/refunds'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'
import { getSellerRefundsPageData } from '@/app/(protected)/seller/_lib/seller-refunds.data'

export default async function SellerRefundsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerRefundsPageData(user, await searchParams)
  const onboardingRedirect = getSellerWorkspaceRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const sellerProfile = data.sellerProfile!

  return (
    <SellerSection
      eyebrow="Refunds"
      title="Повернення покупців"
      description="Переглядайте запити на повернення по своїх товарах і відстежуйте, як вони проходять ручну обробку."
    >
      <SellerVerificationNotice status={sellerProfile.verificationStatus} />

      <SellerTable
        title="Refund requests"
        description="Це read-only вікно для продавця: рішення, approve та фінальні зміни стану робить лише адміністрація."
      >
        <div className="space-y-5 p-5 sm:p-6">
          <form method="GET" className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-copy-secondary">
              <span>Статус</span>
              <select
                name="status"
                defaultValue={data.filters.status ?? ''}
                className="rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
              >
                <option value="">Усі</option>
                {REFUND_REQUEST_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {getRefundStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="ui-secondary-button">
              Застосувати
            </button>
          </form>

          {!data.store ? (
            <EmptyState
              title="Storefront ще не готовий"
              description="Щойно storefront буде підключений, тут з’являться повернення по ваших товарах."
              actionHref="/seller/store"
              actionLabel="Відкрити store settings"
            />
          ) : data.items.length === 0 ? (
            <RefundEmptyState
              title="Повернень по ваших товарах поки що немає"
              description="Коли покупець створить запит на повернення по вашій позиції, він з’явиться тут."
              actionHref="/seller/orders"
              actionLabel="Перейти до замовлень"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <SellerRefundsTable items={data.items} />
              </div>
              <PaginationControls
                pathname="/seller/refunds"
                page={data.page}
                limit={data.limit}
                total={data.total}
                query={{
                  status: data.filters.status,
                }}
              />
            </>
          )}
        </div>
      </SellerTable>
    </SellerSection>
  )
}
