import Link from 'next/link'
import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import SellerPromotionTable from '@/components/promotions/SellerPromotionTable'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getCurrentUser } from '@/lib/session/getSession'
import {
  getSellerPromotionsPageData,
} from '@/app/(protected)/seller/_lib/seller-promotions.data'
import { getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerPromotionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerPromotionsPageData(user, await searchParams)
  const onboardingRedirect = getSellerWorkspaceRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const sellerProfile = data.sellerProfile!

  return (
    <SellerSection
      eyebrow="Промоакції"
      title="Купони продавця"
      description="Створюйте й керуйте акціями для свого магазину, зберігаючи серверний контроль над підсумками в checkout."
    >
      <SellerVerificationNotice status={sellerProfile.verificationStatus} />

      <div className="flex flex-col gap-4 rounded-2xl border border-panelBorder bg-panel/60 px-5 py-5 min-[1204px]:flex-row min-[1204px]:items-center min-[1204px]:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-copy-strong">Огляд промоакцій</h2>
          <p className="text-sm text-copy-muted">
            Купони продавця можуть діяти на весь магазин, вибрані товари або вибрані категорії.
          </p>
        </div>
        <div className="max-[500px]:w-full min-[501px]:max-[1203px]:flex min-[501px]:max-[1203px]:justify-center">
          <Link href="/seller/promotions/new" className="ui-primary-button max-[500px]:w-full">
            Нова промоакція
          </Link>
        </div>
      </div>

      <SellerTable
        title="Ваші промоакції"
        description="Статуси, періоди дії знижок і зведення використання для акцій вашої вітрини."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Промоакцій продавця ще немає"
              description="Створіть свій перший купон магазину, щоб протестувати цільові знижки в checkout."
              actionHref="/seller/promotions/new"
              actionLabel="Створити промоакцію"
            />
          </div>
        ) : (
          <SellerPromotionTable items={data.items} />
        )}
      </SellerTable>
    </SellerSection>
  )
}
