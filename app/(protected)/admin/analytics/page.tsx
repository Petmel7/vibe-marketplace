import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminSection from '@/components/admin/AdminSection'
import AnalyticsAreaChart from '@/components/analytics/AnalyticsAreaChart'
import AnalyticsBarChart from '@/components/analytics/AnalyticsBarChart'
import AnalyticsChartCard from '@/components/analytics/AnalyticsChartCard'
import AnalyticsDateRangeSelector from '@/components/analytics/AnalyticsDateRangeSelector'
import AnalyticsKpiCard from '@/components/analytics/AnalyticsKpiCard'
import TopCategoriesTable from '@/components/analytics/TopCategoriesTable'
import TopProductsTable from '@/components/analytics/TopProductsTable'
import TopSellersTable from '@/components/analytics/TopSellersTable'
import { getAdminAnalyticsViewData } from '@/app/(protected)/admin/_lib/admin-analytics.data'
import { getCurrentUser } from '@/lib/session/getSession'
import { formatPrice } from '@/utils/formatters/price'
import { formatAnalyticsNumber } from '@/components/analytics/analytics.utils'

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminAnalyticsViewData(user, await searchParams)

  return (
    <AdminSection
      eyebrow="Аналітика"
      title="Аналітика маркетплейсу"
      description="GMV, комісії, повернення, суперечки, зростання продавців і навантаження модерації тепер надходять із бекенд-аналітики v2 у вигляді реальних KPI та часових рядів із заповненими нулями проміжками."
    >
      <AnalyticsDateRangeSelector filters={data.filters} />

      {data.status === 'error' ? (
        <AdminEmptyState
          title="Не вдалося завантажити аналітику"
          description={data.errorMessage}
          actionHref="/admin/analytics"
          actionLabel="Спробувати ще раз"
        />
      ) : null}

      {data.status === 'ready' ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AnalyticsKpiCard
              label="GMV"
              value={formatPrice(data.analytics.gmv)}
              trend={data.analytics.gmvGrowthPercent}
              detail={`Попередній період: ${formatPrice(data.analytics.gmvPreviousPeriod)}`}
              tone="success"
            />
            <AnalyticsKpiCard
              label="Комісійна виручка"
              value={formatPrice(data.analytics.commissionRevenue)}
              detail={`Чиста виручка продавців: ${formatPrice(data.analytics.netSellerRevenue)}`}
            />
            <AnalyticsKpiCard
              label="Замовлення"
              value={formatAnalyticsNumber(data.analytics.ordersTotal)}
              detail={`Оплачені: ${data.analytics.paidOrders} · Післяплата: ${data.analytics.codOrders}`}
            />
            <AnalyticsKpiCard
              label="Повернення / суперечки"
              value={`${data.analytics.refundCount} / ${data.analytics.disputeCount}`}
              detail={`Сума повернень: ${formatPrice(data.analytics.refundAmount)} · Рівень суперечок: ${data.analytics.disputeRate}%`}
              tone="danger"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AnalyticsKpiCard
              label="Активні продавці"
              value={data.analytics.activeSellerCount}
              detail={`Нових продавців: ${data.analytics.newSellerCount}`}
            />
            <AnalyticsKpiCard
              label="Товари"
              value={data.analytics.productCount}
              detail={`Опубліковано: ${data.analytics.publishedProductCount}`}
            />
            <AnalyticsKpiCard
              label="Черга модерації"
              value={data.analytics.moderationQueueCount}
              detail={`Схвалення продавців: ${data.analytics.moderationStats.pendingSellerApprovals} · Схвалення товарів: ${data.analytics.moderationStats.pendingProductApprovals}`}
              tone="warning"
            />
            <AnalyticsKpiCard
              label="Невдалі платежі"
              value={data.analytics.failedPayments}
              detail={`Історичний знімок кількості покупців: ${data.analytics.totalBuyers}`}
              tone="danger"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <AnalyticsChartCard
              title="Тренд GMV"
              description="Серверно агрегований тренд GMV / виручки за вибраний період маркетплейсу."
              summary="Бекенд заповнює відсутні часові інтервали нулями, щоб порівняння залишалися стабільними."
            >
              <AnalyticsAreaChart series={data.analytics.revenueSeries} valueLabel="Тренд GMV" />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Комісійна виручка"
              description="Знімки комісії маркетплейсу на основі platform commission records."
            >
              <AnalyticsBarChart
                series={data.analytics.commissionSeries}
                valueLabel="Тренд комісійної виручки"
                color="#7c3aed"
              />
            </AnalyticsChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <AnalyticsChartCard
              title="Потік замовлень"
              description="Обсяг створення замовлень за вибраним інтервалом."
            >
              <AnalyticsBarChart
                series={data.analytics.orderSeries}
                valueLabel="Тренд замовлень маркетплейсу"
                color="#2563eb"
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Зростання продавців"
              description="Нові профілі продавців у вибраному часовому вікні."
            >
              <AnalyticsBarChart
                series={data.analytics.sellerGrowthSeries}
                valueLabel="Тренд зростання продавців"
                color="#0f766e"
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Тиск повернень"
              description="Обсяг запитів на повернення за вибраний інтервал."
            >
              <AnalyticsBarChart
                series={data.analytics.refundSeries}
                valueLabel="Тренд повернень"
                color="#dc2626"
              />
            </AnalyticsChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
            <AnalyticsChartCard
              title="Тренд суперечок"
              description="Навантаження суперечок у trust & safety за вибраний діапазон."
            >
              <AnalyticsAreaChart
                series={data.analytics.disputeSeries}
                valueLabel="Тренд суперечок"
                stroke="#b91c1c"
                fill="rgba(185,28,28,0.14)"
              />
            </AnalyticsChartCard>

            <section className="ui-elevated-panel p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-copy-strong">Підсумок ризику</h2>
              <p className="mt-1 text-sm text-copy-muted">
                Оцінка ризику має рекомендаційний характер і повинна розглядатися разом зі скаргами, суперечками, контекстом модерації та виплатами.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-panel px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Низький</p>
                  <p className="mt-2 text-2xl font-semibold text-copy-strong">{data.analytics.riskSummary.low}</p>
                </div>
                <div className="rounded-2xl bg-panel px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Середній</p>
                  <p className="mt-2 text-2xl font-semibold text-copy-strong">{data.analytics.riskSummary.medium}</p>
                </div>
                <div className="rounded-2xl bg-panel px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Високий</p>
                  <p className="mt-2 text-2xl font-semibold text-copy-strong">{data.analytics.riskSummary.high}</p>
                </div>
                <div className="rounded-2xl bg-panel px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Критичний</p>
                  <p className="mt-2 text-2xl font-semibold text-copy-strong">{data.analytics.riskSummary.critical}</p>
                </div>
              </div>
            </section>

            <section className="ui-elevated-panel p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-copy-strong">Навантаження модерації</h2>
              <div className="mt-5 space-y-3 text-sm text-copy-secondary">
                <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                  <span>Схвалення продавців у черзі</span>
                  <span className="font-semibold text-copy-strong">{data.analytics.moderationStats.pendingSellerApprovals}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                  <span>Схвалення товарів у черзі</span>
                  <span className="font-semibold text-copy-strong">{data.analytics.moderationStats.pendingProductApprovals}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                  <span>Призупинені продавці</span>
                  <span className="font-semibold text-copy-strong">{data.analytics.moderationStats.suspendedSellers}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                  <span>Відхилені товари</span>
                  <span className="font-semibold text-copy-strong">{data.analytics.moderationStats.rejectedProducts}</span>
                </div>
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <TopSellersTable items={data.analytics.topSellers} />
            <TopProductsTable
              items={data.analytics.topProducts}
              title="Топ товари"
              description="Лідери маркетплейсу за виручкою та обсягом проданих одиниць у вибраному періоді."
              variant="admin"
            />
          </div>

          <TopCategoriesTable items={data.analytics.topCategories} />
        </>
      ) : null}
    </AdminSection>
  )
}
