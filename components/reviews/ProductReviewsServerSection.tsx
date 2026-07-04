import { listReviews } from '@/features/review/review.service'
import { measureServerOperation } from '@/lib/observability/server-timing'
import type { ReviewRatingSummary } from '@/types/reviews'
import ProductReviewsSection from './ProductReviewsSection'

export default async function ProductReviewsServerSection({
  productId,
  productName,
  ratingSummary,
}: {
  productId: string
  productName: string
  ratingSummary: ReviewRatingSummary
}) {
  const reviews = await measureServerOperation(
    'product-page-reviews',
    {
      route: '/products/[id]',
      component: 'components/reviews/ProductReviewsServerSection',
      service: 'listReviews',
      reviews: 'initial-page-load',
      productId,
    },
    () => listReviews(productId, { page: 1, limit: 10 }),
  )

  return (
    <ProductReviewsSection
      productId={productId}
      productName={productName}
      ratingSummary={ratingSummary}
      reviews={reviews}
    />
  )
}
