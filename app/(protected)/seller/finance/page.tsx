import Link from 'next/link'
import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import SellerFinanceSummaryCards from '@/components/finance/SellerFinanceSummaryCards'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSellerFinanceSummaryPageData } from '@/app/(protected)/seller/_lib/seller-finance.data'
import { getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'
import MoneyAmount from '@/components/finance/MoneyAmount'

export default async function SellerFinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerFinanceSummaryPageData(user, await searchParams)
  const onboardingRedirect = getSellerWorkspaceRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const sellerProfile = data.sellerProfile!

  return (
    <SellerSection
      eyebrow="Finance"
      title="Фінанси продавця"
      description="Переглядайте утримані, доступні та вже виплачені кошти. Виплати в MVP запускаються вручну адміністраторами маркетплейсу."
    >
      <SellerVerificationNotice status={sellerProfile.verificationStatus} />

      <SellerFinanceSummaryCards summary={data.summary} />

      <div className="ui-panel p-5">
        <h2 className="text-lg font-semibold text-copy-strong">Як працюють кошти</h2>
        <ul className="mt-3 space-y-2 text-sm text-copy-secondary">
          <li>Pending funds утримуються до дати <code>availableAt</code> для кожного ledger entry.</li>
          <li>Available funds можна включити у ручну payout після server-side recalculation.</li>
          <li>Paid out funds — це історично виплачені суми, які не змінюють старі ledger записи.</li>
        </ul>
      </div>

      <SellerTable
        title="Store balances"
        description="Якщо у вас кілька storefronts, маркетплейс веде окремий баланс для кожного store."
      >
        {data.summary.stores.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              title="Фінансових записів поки що немає"
              description="Коли замовлення стануть seller-actionable, тут з’являться balance snapshots і історія нарахувань."
              actionHref="/seller/orders"
              actionLabel="Перейти до замовлень"
            />
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-panel/60 text-left text-copy-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Store</th>
                <th className="px-5 py-3 font-medium">Pending</th>
                <th className="px-5 py-3 font-medium">Available</th>
                <th className="px-5 py-3 font-medium">Paid out</th>
                <th className="px-5 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.summary.stores.map((store) => (
                <tr key={store.storeId} className="border-t border-panelBorder align-top">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-copy-strong">{store.storeName}</p>
                    <p className="mt-1 text-copy-muted">{store.storeId}</p>
                  </td>
                  <td className="px-5 py-4"><MoneyAmount amount={store.pendingAmount} currency={store.currency} /></td>
                  <td className="px-5 py-4"><MoneyAmount amount={store.availableAmount} currency={store.currency} emphasize /></td>
                  <td className="px-5 py-4"><MoneyAmount amount={store.paidOutAmount} currency={store.currency} /></td>
                  <td className="px-5 py-4 text-copy-secondary">{new Date(store.updatedAt).toLocaleString('uk-UA')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SellerTable>

      <div className="flex flex-wrap gap-3">
        <Link href="/seller/finance/ledger" className="ui-secondary-button">Open ledger</Link>
        <Link href="/seller/finance/payouts" className="ui-secondary-button">Open payouts</Link>
      </div>
    </SellerSection>
  )
}
