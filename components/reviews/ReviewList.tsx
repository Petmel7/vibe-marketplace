import type { ReactNode } from 'react'
import type { ProductReview } from '@/types/reviews'
import ReviewItem from './ReviewItem'

export default function ReviewList({
  reviews,
  emptyState,
  showProductMeta = false,
  renderAction,
}: {
  reviews: ProductReview[]
  emptyState?: ReactNode
  showProductMeta?: boolean
  renderAction?: (review: ProductReview) => ReactNode
}) {
  if (reviews.length === 0) {
    return emptyState ? <>{emptyState}</> : null
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewItem
          key={review.id}
          review={review}
          showProductMeta={showProductMeta}
          action={renderAction?.(review)}
        />
      ))}
    </div>
  )
}
