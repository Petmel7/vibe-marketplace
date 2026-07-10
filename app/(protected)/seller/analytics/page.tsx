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
      eyebrow="Аналітика"
      title="Аналітика продавця"
      description="Виручка, замовлення, повернення та балансові показники надходять із бекенд-аналітики й готові до щоденного операційного контролю."
    >
      <SellerVerificationNotice status={sellerProfile.verificationStatus} />
      <AnalyticsDateRangeSelector filters={data.filters} />

      {data.status === 'empty' ? (
        <EmptyState
          title="Аналітика з’явиться після налаштування вітрини"
          description="Завершіть підключення магазину, і тут з’являться виручка, тренди замовлень та фінансові KPI."
          actionHref="/seller/store?setup=storefront"
          actionLabel="Відкрити налаштування магазину"
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
              detail={`В очікуванні: ${formatPrice(data.analytics.pendingBalance)} · Виплачено: ${formatPrice(data.analytics.paidOutAmount)}`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AnalyticsKpiCard
              label="Очікує відправлення"
              value={data.analytics.pendingFulfillmentCount}
              detail="Позиції, які ще очікують на відправлення"
              tone="warning"
            />
            <AnalyticsKpiCard
              label="Відправлено"
              value={data.analytics.shippedFulfillmentCount}
              detail="Позиції в дорозі або вже передані перевізнику"
            />
            <AnalyticsKpiCard
              label="Доставлено"
              value={data.analytics.deliveredFulfillmentCount}
              detail="Позиції, які дійшли до покупців"
              tone="success"
            />
            <AnalyticsKpiCard
              label="Запити на повернення"
              value={data.analytics.refundCount}
              detail={`Сума успішних повернень: ${formatPrice(data.analytics.refundAmount)}`}
              tone="danger"
            />
            <AnalyticsKpiCard
              label="Суперечки"
              value={data.analytics.disputeCount}
              detail="Кількість спорів за вибраний період"
              tone="danger"
            />
            <AnalyticsKpiCard
              label="Виручка за 30 днів"
              value={formatPrice(data.analytics.revenueLast30Days)}
              detail={`Загальна виручка: ${formatPrice(data.analytics.totalRevenue)}`}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <AnalyticsChartCard
              title="Тренд виручки"
              description="Серверний ряд із даними виручки по позиціях замовлень."
              summary="Пропущені періоди вже заповнюються нулями на сервері, тож рівні проміжки показані явно."
            >
              <AnalyticsAreaChart
                series={data.analytics.revenueSeries}
                valueLabel="Тренд виручки продавця"
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Тренд замовлень"
              description="Кількість замовлень у вибраному інтервалі без клієнтських перерахунків."
              summary="Значення відображаються як серверно агрегований ряд замовлень."
            >
              <AnalyticsBarChart
                series={data.analytics.orderSeries}
                valueLabel="Тренд замовлень продавця"
              />
            </AnalyticsChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <AnalyticsChartCard
              title="Динаміка виконання"
              description="Активність по відправленнях допомагає бачити хвилі оформлення та швидкість доставки."
              summary="Основне значення показує активність позицій, а доставлені точки відстежуються як додаткова метрика."
            >
              <AnalyticsBarChart
                series={data.analytics.fulfillmentSeries}
                valueLabel="Активність виконання продавця"
                color="#d97706"
              />
            </AnalyticsChartCard>

            <section className="ui-elevated-panel p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-copy-strong">Виплати та баланс</h2>
              <p className="mt-1 text-sm text-copy-muted">
                Кошти в очікуванні утримуються до завершення вікна доступності, а виплати маркетплейс обробляє вручну.
              </p>

              <div className="mt-5 space-y-3 text-sm text-copy-secondary">
                <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                  <span>Доступно</span>
                  <span className="font-semibold text-copy-strong">{formatPrice(data.analytics.availableBalance)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                  <span>В очікуванні</span>
                  <span className="font-semibold text-copy-strong">{formatPrice(data.analytics.pendingBalance)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                  <span>Виплачено</span>
                  <span className="font-semibold text-copy-strong">{formatPrice(data.analytics.paidOutAmount)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                  <span>Середній чек</span>
                  <span className="font-semibold text-copy-strong">{formatPrice(data.analytics.averageOrderValue)}</span>
                </div>
              </div>
            </section>
          </div>

          <TopProductsTable
            items={data.analytics.topProducts}
            title="Топ товарів"
            description="Лідери продажів і виручки у вибраному періоді."
          />
        </>
      ) : null}
    </SellerSection>
  )
}
