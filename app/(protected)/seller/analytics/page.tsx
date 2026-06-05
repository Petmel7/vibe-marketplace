import { redirect } from 'next/navigation'
import AnalyticsAreaChart from '@/components/analytics/AnalyticsAreaChart'
import AnalyticsBarChart from '@/components/analytics/AnalyticsBarChart'
import AnalyticsChartCard from '@/components/analytics/AnalyticsChartCard'
import AnalyticsDateRangeSelector from '@/components/analytics/AnalyticsDateRangeSelector'
import AnalyticsKpiCard from '@/components/analytics/AnalyticsKpiCard'
import TopProductsTable from '@/components/analytics/TopProductsTable'
import EmptyState from '@/components/profile/EmptyState'
import SellerSection from '@/components/seller/SellerSection'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getSellerAnalyticsViewData } from '@/app/(protected)/seller/_lib/seller-analytics.data'
import { getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'
import { getCurrentUser } from '@/lib/session/getSession'
import { formatPrice } from '@/utils/formatters/price'
import { formatAnalyticsNumber } from '@/components/analytics/analytics.utils'

export default async function SellerAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerAnalyticsViewData(user, await searchParams)
  const onboardingRedirect = getSellerWorkspaceRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const sellerProfile = data.sellerProfile!

  return (
    <SellerSection
      eyebrow="Analytics"
      title="Seller analytics"
      description="Виручка, замовлення, повернення та balance snapshot тепер приходять з backend analytics v2 і готові для щоденного операційного контролю."
    >
      <SellerVerificationNotice status={sellerProfile.verificationStatus} />
      <AnalyticsDateRangeSelector filters={data.filters} />

      {data.status === 'empty' ? (
        <EmptyState
          title="Аналітика з’явиться після налаштування storefront"
          description="Завершіть підключення магазину, і тут з’являться виручка, тренди замовлень та фінансові KPI."
          actionHref="/seller/store?setup=storefront"
          actionLabel="Відкрити store settings"
        />
      ) : null}

      {data.status === 'error' ? (
        <EmptyState
          title="Не вдалося завантажити аналітику"
          description={data.errorMessage}
          actionHref="/seller/analytics"
          actionLabel="Спробувати ще раз"
        />
      ) : null}

      {data.status === 'ready' ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AnalyticsKpiCard
              label="Виручка"
              value={formatPrice(data.analytics.revenueTotal)}
              trend={data.analytics.revenueGrowthPercent}
              detail={`Попередній період: ${formatPrice(data.analytics.revenuePreviousPeriod)}`}
              tone="success"
            />
            <AnalyticsKpiCard
              label="Замовлення"
              value={data.analytics.ordersTotal}
              trend={data.analytics.ordersGrowthPercent}
              detail={`Попередній період: ${formatAnalyticsNumber(data.analytics.ordersPreviousPeriod)}`}
            />
            <AnalyticsKpiCard
              label="Продано одиниць"
              value={formatAnalyticsNumber(data.analytics.unitsSold)}
              detail={`Середній чек: ${formatPrice(data.analytics.averageOrderValue)}`}
            />
            <AnalyticsKpiCard
              label="Доступний баланс"
              value={formatPrice(data.analytics.availableBalance)}
              detail={`Pending: ${formatPrice(data.analytics.pendingBalance)} · Paid out: ${formatPrice(data.analytics.paidOutAmount)}`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AnalyticsKpiCard
              label="Pending fulfillment"
              value={data.analytics.pendingFulfillmentCount}
              detail="Позиції, які ще очікують на відправлення"
              tone="warning"
            />
            <AnalyticsKpiCard
              label="Shipped"
              value={data.analytics.shippedFulfillmentCount}
              detail="Позиції в дорозі або вже передані перевізнику"
            />
            <AnalyticsKpiCard
              label="Delivered"
              value={data.analytics.deliveredFulfillmentCount}
              detail="Позиції, які дійшли до покупців"
              tone="success"
            />
            <AnalyticsKpiCard
              label="Refund requests"
              value={data.analytics.refundCount}
              detail={`Сума успішних повернень: ${formatPrice(data.analytics.refundAmount)}`}
              tone="danger"
            />
            <AnalyticsKpiCard
              label="Disputes"
              value={data.analytics.disputeCount}
              detail="Кількість спорів за вибраний період"
              tone="danger"
            />
            <AnalyticsKpiCard
              label="Legacy 30d revenue"
              value={formatPrice(data.analytics.revenueLast30Days)}
              detail={`All-time revenue snapshot: ${formatPrice(data.analytics.totalRevenue)}`}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <AnalyticsChartCard
              title="Тренд виручки"
              description="Серверна серія з revenue snapshots по order items."
              summary="Backend already zero-fills missing buckets, so flat periods are shown explicitly."
            >
              <AnalyticsAreaChart
                series={data.analytics.revenueSeries}
                valueLabel="Тренд виручки продавця"
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Тренд замовлень"
              description="Кількість замовлень у вибраному інтервалі без клієнтських перерахунків."
              summary="Значення відображаються як server-aggregated order series."
            >
              <AnalyticsBarChart
                series={data.analytics.orderSeries}
                valueLabel="Тренд замовлень продавця"
              />
            </AnalyticsChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <AnalyticsChartCard
              title="Fulfillment cadence"
              description="Серія по fulfillment activity допомагає бачити хвилі відправлень і delivery throughput."
              summary="Primary value shows item activity; delivered points are tracked as a secondary metric in the backend series."
            >
              <AnalyticsBarChart
                series={data.analytics.fulfillmentSeries}
                valueLabel="Активність fulfillment продавця"
                color="#d97706"
              />
            </AnalyticsChartCard>

            <section className="ui-elevated-panel p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-copy-strong">Payout & balance context</h2>
              <p className="mt-1 text-sm text-copy-muted">
                Pending funds утримуються до availability window, а payout-и обробляються вручну маркетплейсом.
              </p>

              <div className="mt-5 space-y-3 text-sm text-copy-secondary">
                <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                  <span>Available</span>
                  <span className="font-semibold text-copy-strong">{formatPrice(data.analytics.availableBalance)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                  <span>Pending</span>
                  <span className="font-semibold text-copy-strong">{formatPrice(data.analytics.pendingBalance)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                  <span>Paid out</span>
                  <span className="font-semibold text-copy-strong">{formatPrice(data.analytics.paidOutAmount)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                  <span>Average order value</span>
                  <span className="font-semibold text-copy-strong">{formatPrice(data.analytics.averageOrderValue)}</span>
                </div>
              </div>
            </section>
          </div>

          <TopProductsTable
            items={data.analytics.topProducts}
            title="Топ товари"
            description="Лідери продажів і виручки у вибраному періоді."
          />
        </>
      ) : null}
    </SellerSection>
  )
}
