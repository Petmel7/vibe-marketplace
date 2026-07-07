'use client'

import { useEffect, useState } from 'react'
import type { ProductReviewList, ReviewRatingSummary } from '@/types/reviews'
import { apiClient } from '@/shared/api/api.client'
import ProductReviewsSection from './ProductReviewsSection'
import ProductReviewsSectionFallback from './ProductReviewsSectionFallback'

type ProductReviewsClientSectionProps = {
  productId: string
  productName: string
  ratingSummary: ReviewRatingSummary
}

const EMPTY_REVIEW_LIST = (ratingSummary: ReviewRatingSummary): ProductReviewList => ({
  items: [],
  total: 0,
  page: 1,
  limit: 10,
  averageRating: ratingSummary.totalCount > 0 ? ratingSummary.averageRating : null,
  ratingSummary,
})

export default function ProductReviewsClientSection({
  productId,
  productName,
  ratingSummary,
}: ProductReviewsClientSectionProps) {
  const [reviews, setReviews] = useState<ProductReviewList | null>(null)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadReviews() {
      try {
        const data = await apiClient.get<ProductReviewList>(
          `/api/products/${productId}/reviews?page=1&limit=10`,
          { signal: controller.signal },
        )

        if (controller.signal.aborted) {
          return
        }

        setReviews(data)
        setHasError(false)
      } catch {
        if (controller.signal.aborted) {
          return
        }

        setReviews(EMPTY_REVIEW_LIST(ratingSummary))
        setHasError(true)
      }
    }

    setReviews(null)
    setHasError(false)
    void loadReviews()

    return () => controller.abort()
  }, [productId, ratingSummary])

  if (!reviews) {
    return <ProductReviewsSectionFallback summary={ratingSummary} />
  }

  return (
    <div className="space-y-4">
      {hasError ? (
        <p
          className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-copy-primary"
          role="status"
        >
          Не вдалося завантажити відгуки одразу. Спробуйте оновити сторінку трохи пізніше.
        </p>
      ) : null}

      <ProductReviewsSection
        productId={productId}
        productName={productName}
        ratingSummary={ratingSummary}
        reviews={reviews}
      />
    </div>
  )
}
