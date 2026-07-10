import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import PaginationControls from '@/components/admin/PaginationControls'
import DisputeSummaryList from '@/components/disputes/DisputeSummaryList'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getCurrentUser } from '@/lib/session/getSession'
import {
  getSellerDisputesPageData,
} from '@/app/(protected)/seller/_lib/seller-disputes.data'
import { getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerDisputesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerDisputesPageData(user, await searchParams)
  const onboardingRedirect = getSellerWorkspaceRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const sellerProfile = data.sellerProfile!

  return (
    <SellerSection
      eyebrow="Суперечки"
      title="Суперечки по замовленнях"
      description="Переглядайте суперечки по своїх товарах, відповідайте покупцям та додавайте матеріали."
    >
      <SellerVerificationNotice status={sellerProfile.verificationStatus} />

      <SellerTable
        title="Суперечки продавця"
        description="Тут відображаються лише ті суперечки по замовленнях, у яких є ваші товари."
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
                <option value="OPEN">Відкрито</option>
                <option value="UNDER_REVIEW">На розгляді</option>
                <option value="WAITING_BUYER">Очікуємо покупця</option>
                <option value="WAITING_SELLER">Очікуємо продавця</option>
                <option value="ESCALATED">Ескальовано</option>
                <option value="RESOLVED">Вирішено</option>
                <option value="REJECTED">Відхилено</option>
                <option value="CLOSED">Закрито</option>
              </select>
            </label>
            <button type="submit" className="ui-secondary-button">
              Застосувати
            </button>
          </form>

          {data.items.length === 0 ? (
            <EmptyState
              title="Суперечок поки що немає"
              description="Коли покупці відкриють суперечку по ваших товарах, вона з’явиться тут."
              actionHref="/seller/orders"
              actionLabel="Перейти до замовлень"
            />
          ) : (
            <>
              <DisputeSummaryList disputes={data.items} detailBasePath="/seller/disputes" />
              <PaginationControls
                pathname="/seller/disputes"
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
