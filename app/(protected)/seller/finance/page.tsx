import Link from 'next/link'
import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import SellerFinanceSummaryCards from '@/components/finance/SellerFinanceSummaryCards'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import {
  DataTable,
  TableCell,
  TableDateCell,
  TableHead,
  TableHeaderCell,
  TableMetaCell,
  TableRow,
} from '@/components/ui/table'
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
      eyebrow="Фінанси"
      title="Фінанси продавця"
      description="Переглядайте кошти в очікуванні, доступний баланс і вже виплачені суми. У MVP виплати запускаються вручну адміністраторами маркетплейсу."
    >
      <SellerVerificationNotice status={sellerProfile.verificationStatus} />

      <SellerFinanceSummaryCards summary={data.summary} />

      <div className="ui-panel p-5">
        <h2 className="text-lg font-semibold text-copy-strong">Як працюють кошти</h2>
        <ul className="mt-3 space-y-2 text-sm text-copy-secondary">
          <li>Кошти в очікуванні утримуються до дати <code>availableAt</code> для кожного запису в книзі операцій.</li>
          <li>Доступний баланс можна включити до ручної виплати після серверного перерахунку.</li>
          <li>Виплачені кошти — це історично завершені виплати, які не змінюють старі записи в книзі операцій.</li>
        </ul>
      </div>

      <SellerTable
        title="Баланси магазинів"
        description="Якщо у вас кілька вітрин, маркетплейс веде окремий баланс для кожного магазину."
      >
        {data.summary.stores.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              title="Фінансових записів поки що немає"
              description="Коли замовлення стануть доступними для обробки продавцем, тут з’являться балансові знімки та історія нарахувань."
              actionHref="/seller/orders"
              actionLabel="Перейти до замовлень"
            />
          </div>
        ) : (
          <DataTable>
            <TableHead>
              <tr>
                <TableHeaderCell>Магазин</TableHeaderCell>
                <TableHeaderCell>В очікуванні</TableHeaderCell>
                <TableHeaderCell>Доступно</TableHeaderCell>
                <TableHeaderCell>Виплачено</TableHeaderCell>
                <TableHeaderCell>Оновлено</TableHeaderCell>
              </tr>
            </TableHead>
            <tbody>
              {data.summary.stores.map((store) => (
                <TableRow key={store.storeId}>
                  <TableMetaCell title={store.storeName} meta={store.storeId} />
                  <TableCell><MoneyAmount amount={store.pendingAmount} currency={store.currency} /></TableCell>
                  <TableCell><MoneyAmount amount={store.availableAmount} currency={store.currency} emphasize /></TableCell>
                  <TableCell><MoneyAmount amount={store.paidOutAmount} currency={store.currency} /></TableCell>
                  <TableDateCell value={store.updatedAt} />
                </TableRow>
              ))}
            </tbody>
          </DataTable>
        )}
      </SellerTable>

      <div className="flex flex-wrap justify-center gap-3 max-[499px]:flex-col max-[499px]:[&>*]:w-full">
        <Link href="/seller/finance/ledger" className="ui-secondary-button min-[500px]:w-64">Відкрити книгу операцій</Link>
        <Link href="/seller/finance/payouts" className="ui-secondary-button min-[500px]:w-64">Відкрити виплати</Link>
      </div>
    </SellerSection>
  )
}
