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
      eyebrow="Analytics"
      title="Marketplace analytics"
      description="GMV, commissions, refunds, disputes, seller growth і moderation pressure тепер приходять із backend analytics v2 у вигляді реальних KPI та zero-filled series."
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
              label="Commission revenue"
              value={formatPrice(data.analytics.commissionRevenue)}
              detail={`Net seller revenue: ${formatPrice(data.analytics.netSellerRevenue)}`}
            />
            <AnalyticsKpiCard
              label="Orders"
              value={formatAnalyticsNumber(data.analytics.ordersTotal)}
              detail={`Paid: ${data.analytics.paidOrders} · COD: ${data.analytics.codOrders}`}
            />
            <AnalyticsKpiCard
              label="Refunds / disputes"
              value={`${data.analytics.refundCount} / ${data.analytics.disputeCount}`}
              detail={`Refund amount: ${formatPrice(data.analytics.refundAmount)} · Dispute rate: ${data.analytics.disputeRate}%`}
              tone="danger"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AnalyticsKpiCard
              label="Active sellers"
              value={data.analytics.activeSellerCount}
              detail={`Нових продавців: ${data.analytics.newSellerCount}`}
            />
            <AnalyticsKpiCard
              label="Products"
              value={data.analytics.productCount}
              detail={`Published: ${data.analytics.publishedProductCount}`}
            />
            <AnalyticsKpiCard
              label="Moderation queue"
              value={data.analytics.moderationQueueCount}
              detail={`Seller approvals: ${data.analytics.moderationStats.pendingSellerApprovals} · Product approvals: ${data.analytics.moderationStats.pendingProductApprovals}`}
              tone="warning"
            />
            <AnalyticsKpiCard
              label="Failed payments"
              value={data.analytics.failedPayments}
              detail={`Legacy buyer count snapshot: ${data.analytics.totalBuyers}`}
              tone="danger"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <AnalyticsChartCard
              title="GMV trend"
              description="Server-aggregated GMV / revenue trend for the selected marketplace window."
              summary="The backend fills missing buckets with zero to keep comparisons stable."
            >
              <AnalyticsAreaChart series={data.analytics.revenueSeries} valueLabel="GMV trend" />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Commission revenue"
              description="Marketplace commission snapshots from platform commission records."
            >
              <AnalyticsBarChart
                series={data.analytics.commissionSeries}
                valueLabel="Commission revenue trend"
                color="#7c3aed"
              />
            </AnalyticsChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <AnalyticsChartCard
              title="Order flow"
              description="Order creation volume by selected interval."
            >
              <AnalyticsBarChart
                series={data.analytics.orderSeries}
                valueLabel="Marketplace order trend"
                color="#2563eb"
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Seller growth"
              description="New seller profiles over time in the selected window."
            >
              <AnalyticsBarChart
                series={data.analytics.sellerGrowthSeries}
                valueLabel="Seller growth trend"
                color="#0f766e"
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Refund pressure"
              description="Refund request volume in the selected interval."
            >
              <AnalyticsBarChart
                series={data.analytics.refundSeries}
                valueLabel="Refund trend"
                color="#dc2626"
              />
            </AnalyticsChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
            <AnalyticsChartCard
              title="Dispute trend"
              description="Trust & safety dispute load across the selected range."
            >
              <AnalyticsAreaChart
                series={data.analytics.disputeSeries}
                valueLabel="Dispute trend"
                stroke="#b91c1c"
                fill="rgba(185,28,28,0.14)"
              />
            </AnalyticsChartCard>

            <section className="ui-elevated-panel p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-copy-strong">Risk summary</h2>
              <p className="mt-1 text-sm text-copy-muted">
                Risk scoring is advisory only and should be combined with reports, disputes, moderation context, and payouts.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-panel px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Low</p>
                  <p className="mt-2 text-2xl font-semibold text-copy-strong">{data.analytics.riskSummary.low}</p>
                </div>
                <div className="rounded-2xl bg-panel px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Medium</p>
                  <p className="mt-2 text-2xl font-semibold text-copy-strong">{data.analytics.riskSummary.medium}</p>
                </div>
                <div className="rounded-2xl bg-panel px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">High</p>
                  <p className="mt-2 text-2xl font-semibold text-copy-strong">{data.analytics.riskSummary.high}</p>
                </div>
                <div className="rounded-2xl bg-panel px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Critical</p>
                  <p className="mt-2 text-2xl font-semibold text-copy-strong">{data.analytics.riskSummary.critical}</p>
                </div>
              </div>
            </section>

            <section className="ui-elevated-panel p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-copy-strong">Moderation pressure</h2>
              <div className="mt-5 space-y-3 text-sm text-copy-secondary">
                <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                  <span>Pending seller approvals</span>
                  <span className="font-semibold text-copy-strong">{data.analytics.moderationStats.pendingSellerApprovals}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                  <span>Pending product approvals</span>
                  <span className="font-semibold text-copy-strong">{data.analytics.moderationStats.pendingProductApprovals}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                  <span>Suspended sellers</span>
                  <span className="font-semibold text-copy-strong">{data.analytics.moderationStats.suspendedSellers}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                  <span>Rejected products</span>
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
              description="Лідери маркетплейсу за виручкою та unit volume у вибраному періоді."
              variant="admin"
            />
          </div>

          <TopCategoriesTable items={data.analytics.topCategories} />
        </>
      ) : null}
    </AdminSection>
  )
}
