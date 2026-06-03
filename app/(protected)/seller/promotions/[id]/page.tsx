import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import DashboardCard from '@/components/profile/DashboardCard'
import SellerPromotionForm from '@/components/promotions/SellerPromotionForm'
import PromotionStatusBadge from '@/components/promotions/PromotionStatusBadge'
import PromotionUsageSummary from '@/components/promotions/PromotionUsageSummary'
import SellerSection from '@/components/seller/SellerSection'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'
import { getSellerPromotionEditorData } from '@/app/(protected)/seller/_lib/seller-promotions.data'
import {
  getPromotionDiscountTypeLabel,
  getPromotionTargetTypeLabel,
} from '@/types/promotions'
import { formatPrice } from '@/utils/formatters/price'

function getDiscountLabel(discountType: 'PERCENTAGE' | 'FIXED_AMOUNT', discountValue: string) {
  if (discountType === 'PERCENTAGE') {
    return `${discountValue}%`
  }

  return formatPrice(discountValue)
}

export default async function SellerPromotionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const { id } = await params
  const data = await getSellerPromotionEditorData(user, id)
  const onboardingRedirect = getSellerWorkspaceRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const sellerProfile = data.sellerProfile!

  if (!data.promotion || !data.promotionStore) {
    notFound()
  }

  return (
    <SellerSection
      eyebrow="Promotions"
      title={data.promotion.name}
      description="Review scope, usage, and activation windows for your seller-owned promotion."
    >
      <SellerVerificationNotice status={sellerProfile.verificationStatus} />

      <Link href="/seller/promotions" className="ui-link-muted">
        Back to promotions
      </Link>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <DashboardCard
          title={data.promotion.code}
          description="Promotion health, scope, and usage overview"
          action={<PromotionStatusBadge promotion={data.promotion} />}
        >
          <div className="space-y-5">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Discount</dt>
                <dd className="text-sm font-medium text-copy-strong">
                  {getDiscountLabel(data.promotion.discountType, data.promotion.discountValue)}
                </dd>
                <p className="text-sm text-copy-muted">{getPromotionDiscountTypeLabel(data.promotion.discountType)}</p>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Starts</dt>
                <dd className="text-sm text-copy-secondary">{new Date(data.promotion.startsAt).toLocaleString('uk-UA')}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Ends</dt>
                <dd className="text-sm text-copy-secondary">
                  {data.promotion.endsAt ? new Date(data.promotion.endsAt).toLocaleString('uk-UA') : 'No expiry'}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Minimum order</dt>
                <dd className="text-sm text-copy-secondary">
                  {data.promotion.minOrderAmount ? formatPrice(data.promotion.minOrderAmount) : 'No minimum'}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Maximum discount</dt>
                <dd className="text-sm text-copy-secondary">
                  {data.promotion.maxDiscountAmount ? formatPrice(data.promotion.maxDiscountAmount) : 'No cap'}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Store</dt>
                <dd className="text-sm text-copy-secondary">{data.promotionStore.name}</dd>
              </div>
            </dl>

            <PromotionUsageSummary promotion={data.promotion} />

            <div className="rounded-2xl border border-panelBorder bg-panel/60 px-4 py-4 text-sm text-copy-secondary">
              <p className="font-medium text-copy-strong">Target scope</p>
              <ul className="mt-2 space-y-2">
                {data.promotion.targets.map((target) => (
                  <li key={target.id}>
                    {getPromotionTargetTypeLabel(target.targetType)} · {target.targetId}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-panelBorder bg-panel/60 px-4 py-4 text-sm text-copy-secondary">
              <p className="font-medium text-copy-strong">Historical snapshots</p>
              <p className="mt-1">
                {data.promotion.orderPromotionCount} order snapshot
                {data.promotion.orderPromotionCount === 1 ? '' : 's'} keep this seller promotion&apos;s original discount context even if you edit it now.
              </p>
            </div>
          </div>
        </DashboardCard>

        <SellerPromotionForm
          mode="edit"
          store={data.promotionStore}
          products={data.promotionProducts}
          categories={data.promotionCategories}
          initialPromotion={data.promotion}
        />
      </div>
    </SellerSection>
  )
}
