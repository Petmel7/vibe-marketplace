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
      eyebrow="Reviews"
      title="Customer reviews"
      description="Track published buyer feedback on your products and reply from the seller workspace."
    >
      <SellerVerificationNotice status={sellerProfile.verificationStatus} />

      <SellerTable
        title="Published product reviews"
        description="Only marketplace-published reviews are visible here. Seller replies appear publicly on the product page."
      >
        <div className="p-5 sm:p-6">
          <ReviewList
            reviews={data.reviews}
            showProductMeta
            emptyState={
              <EmptyState
                title="No published reviews yet"
                description="Once buyers leave approved reviews on your products, they will appear here for follow-up."
                actionHref="/seller/products"
                actionLabel="Open products"
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
