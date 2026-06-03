import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import SellerPayoutHistoryTable from '@/components/finance/SellerPayoutHistoryTable'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import PaginationControls from '@/components/admin/PaginationControls'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSellerFinancePayoutsPageData } from '@/app/(protected)/seller/_lib/seller-finance.data'
import { getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'
import { PAYOUT_STATUSES, getPayoutStatusLabel } from '@/types/payouts'

export default async function SellerFinancePayoutsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerFinancePayoutsPageData(user, await searchParams)
  const onboardingRedirect = getSellerWorkspaceRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const sellerProfile = data.sellerProfile!

  return (
    <SellerSection
      eyebrow="Finance"
      title="Історія виплат"
      description="Маркетплейс обробляє payouts вручну. Тут видно поточний статус кожної виплати та її payout batch."
    >
      <SellerVerificationNotice status={sellerProfile.verificationStatus} />

      <SellerTable
        title="Payout history"
        description="Виплати виконуються вручну маркетплейсом після переходу коштів у available balance."
      >
        <div className="space-y-5 p-5 sm:p-6">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Статус</span>
              <select name="status" defaultValue={data.filters.status ?? ''} className="ui-surface-input min-w-48">
                <option value="">Усі</option>
                {PAYOUT_STATUSES.map((status) => (
                  <option key={status} value={status}>{getPayoutStatusLabel(status)}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="ui-secondary-button">Застосувати</button>
          </form>

          {data.items.length === 0 ? (
            <EmptyState
              title="Виплат поки що немає"
              description="Коли marketplace admin створить payout для вашого available balance, запис з’явиться тут."
              actionHref="/seller/finance"
              actionLabel="Повернутися до summary"
            />
          ) : (
            <>
              <SellerPayoutHistoryTable items={data.items} />
              <PaginationControls
                pathname="/seller/finance/payouts"
                page={data.page}
                limit={data.limit}
                total={data.total}
                query={{
                  status: data.filters.status,
                  limit: String(data.limit),
                }}
              />
            </>
          )}
        </div>
      </SellerTable>
    </SellerSection>
  )
}
