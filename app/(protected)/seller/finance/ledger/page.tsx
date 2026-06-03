import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import SellerLedgerTable from '@/components/finance/SellerLedgerTable'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import PaginationControls from '@/components/admin/PaginationControls'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSellerFinanceLedgerPageData } from '@/app/(protected)/seller/_lib/seller-finance.data'
import { getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'
import { LEDGER_ENTRY_STATUSES, LEDGER_ENTRY_TYPES } from '@/types/payouts'
import { getLedgerEntryStatusLabel, getLedgerEntryTypeLabel } from '@/types/payouts'

export default async function SellerFinanceLedgerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerFinanceLedgerPageData(user, await searchParams)
  const onboardingRedirect = getSellerWorkspaceRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const sellerProfile = data.sellerProfile!

  return (
    <SellerSection
      eyebrow="Finance"
      title="Ledger продавця"
      description="Історія immutable ledger entries для seller earnings, утримань і payout allocation."
    >
      <SellerVerificationNotice status={sellerProfile.verificationStatus} />

      <SellerTable
        title="Ledger entries"
        description="Відфільтруйте записи за статусом або типом, щоб побачити, коли кошти стануть доступними."
      >
        <div className="space-y-5 p-5 sm:p-6">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Статус</span>
              <select name="status" defaultValue={data.filters.status ?? ''} className="ui-surface-input min-w-48">
                <option value="">Усі</option>
                {LEDGER_ENTRY_STATUSES.map((status) => (
                  <option key={status} value={status}>{getLedgerEntryStatusLabel(status)}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Тип</span>
              <select name="type" defaultValue={data.filters.type ?? ''} className="ui-surface-input min-w-48">
                <option value="">Усі</option>
                {LEDGER_ENTRY_TYPES.map((type) => (
                  <option key={type} value={type}>{getLedgerEntryTypeLabel(type)}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="ui-secondary-button">Застосувати</button>
          </form>

          {data.items.length === 0 ? (
            <EmptyState
              title="Ledger записів поки що немає"
              description="Після seller-actionable orders тут з’являться commission-backed ledger entries."
              actionHref="/seller/finance"
              actionLabel="Повернутися до summary"
            />
          ) : (
            <>
              <SellerLedgerTable items={data.items} />
              <PaginationControls
                pathname="/seller/finance/ledger"
                page={data.page}
                limit={data.limit}
                total={data.total}
                query={{
                  status: data.filters.status,
                  type: data.filters.type,
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
