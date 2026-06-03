import Link from 'next/link'
import { notFound } from 'next/navigation'
import AdminSection from '@/components/admin/AdminSection'
import DashboardCard from '@/components/profile/DashboardCard'
import PromotionForm from '@/components/promotions/PromotionForm'
import PromotionStatusBadge from '@/components/promotions/PromotionStatusBadge'
import PromotionUsageSummary from '@/components/promotions/PromotionUsageSummary'
import { getAdminPromotionDetailPageData } from '@/app/(protected)/admin/_lib/admin-promotions.data'
import { getCurrentUser } from '@/lib/session/getSession'
import {
  getPromotionDiscountTypeLabel,
  getPromotionTypeLabel,
} from '@/types/promotions'
import { formatPrice } from '@/utils/formatters/price'

function getDiscountLabel(discountType: 'PERCENTAGE' | 'FIXED_AMOUNT', discountValue: string) {
  if (discountType === 'PERCENTAGE') {
    return `${discountValue}%`
  }

  return formatPrice(discountValue)
}

export default async function AdminPromotionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const { id } = await params
  const promotion = await getAdminPromotionDetailPageData(user, id)

  if (!promotion) {
    notFound()
  }

  return (
    <AdminSection
      eyebrow="Promotions"
      title={promotion.name}
      description="Review historical usage, confirm the active window, and update promotion settings without affecting past order snapshots."
    >
      <Link href="/admin/promotions" className="ui-link-muted">
        Back to promotions
      </Link>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <DashboardCard
          title={promotion.code}
          description="Promotion health and usage overview"
          action={<PromotionStatusBadge promotion={promotion} />}
        >
          <div className="space-y-5">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Type</dt>
                <dd className="text-sm font-medium text-copy-strong">{getPromotionTypeLabel(promotion.type)}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Discount</dt>
                <dd className="text-sm font-medium text-copy-strong">
                  {getDiscountLabel(promotion.discountType, promotion.discountValue)}
                </dd>
                <p className="text-sm text-copy-muted">{getPromotionDiscountTypeLabel(promotion.discountType)}</p>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Starts</dt>
                <dd className="text-sm text-copy-secondary">{new Date(promotion.startsAt).toLocaleString('uk-UA')}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Ends</dt>
                <dd className="text-sm text-copy-secondary">
                  {promotion.endsAt ? new Date(promotion.endsAt).toLocaleString('uk-UA') : 'No expiry'}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Minimum order</dt>
                <dd className="text-sm text-copy-secondary">
                  {promotion.minOrderAmount ? formatPrice(promotion.minOrderAmount) : 'No minimum'}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Maximum discount</dt>
                <dd className="text-sm text-copy-secondary">
                  {promotion.maxDiscountAmount ? formatPrice(promotion.maxDiscountAmount) : 'No cap'}
                </dd>
              </div>
            </dl>

            <PromotionUsageSummary promotion={promotion} />

            <div className="rounded-2xl border border-panelBorder bg-panel/60 px-4 py-4 text-sm text-copy-secondary">
              <p className="font-medium text-copy-strong">Historical discount usage</p>
              <p className="mt-1">
                {promotion.orderPromotionCount} order snapshot
                {promotion.orderPromotionCount === 1 ? '' : 's'} keep this promotion’s original discount
                values even if you edit the rule now.
              </p>
            </div>
          </div>
        </DashboardCard>

        <PromotionForm mode="edit" initialPromotion={promotion} />
      </div>
    </AdminSection>
  )
}
