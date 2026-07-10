import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import ReviewList from '@/components/reviews/ReviewList'
import SellerReviewReplyForm from '@/components/reviews/SellerReviewReplyForm'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSellerReviewsPageData, getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerReviewsPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerReviewsPageData(user)
  const onboardingRedirect = getSellerWorkspaceRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const sellerProfile = data.sellerProfile!

  return (
    <SellerSection
      eyebrow="Відгуки"
      title="Відгуки покупців"
      description="Переглядайте опубліковані відгуки про ваші товари та відповідайте на них із кабінету продавця."
    >
      <SellerVerificationNotice status={sellerProfile.verificationStatus} />

      <SellerTable
        title="Опубліковані відгуки про товари"
        description="Тут відображаються лише опубліковані маркетплейсом відгуки. Відповіді продавця публічно видно на сторінці товару."
      >
        <div className="p-5 sm:p-6">
          <ReviewList
            reviews={data.reviews}
            showProductMeta
            emptyState={
              <EmptyState
                title="Опублікованих відгуків ще немає"
                description="Коли покупці залишать схвалені відгуки про ваші товари, вони з’являться тут для подальшої роботи."
                actionHref="/seller/products"
                actionLabel="Відкрити товари"
              />
            }
            renderAction={(review) => (
              <div className="w-full max-w-md">
                <SellerReviewReplyForm reviewId={review.id} initialValue={review.sellerReply} />
              </div>
            )}
          />
        </div>
      </SellerTable>
    </SellerSection>
  )
}
