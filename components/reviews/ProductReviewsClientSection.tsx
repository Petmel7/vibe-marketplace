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

function getReviewRequestKey(productId: string, ratingSummary: ReviewRatingSummary) {
  return [
    productId,
    ratingSummary.averageRating,
    ratingSummary.totalCount,
    ratingSummary.rating1Count,
    ratingSummary.rating2Count,
    ratingSummary.rating3Count,
    ratingSummary.rating4Count,
    ratingSummary.rating5Count,
  ].join(':')
}

type ReviewState = {
  requestKey: string
  reviews: ProductReviewList
  hasError: boolean
}

export default function ProductReviewsClientSection({
  productId,
  productName,
  ratingSummary,
}: ProductReviewsClientSectionProps) {
  const [reviewState, setReviewState] = useState<ReviewState | null>(null)
  const requestKey = getReviewRequestKey(productId, ratingSummary)

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

        setReviewState({ requestKey, reviews: data, hasError: false })
      } catch {
        if (controller.signal.aborted) {
          return
        }

        setReviewState({
          requestKey,
          reviews: EMPTY_REVIEW_LIST(ratingSummary),
          hasError: true,
        })
      }
    }

    void loadReviews()

    return () => controller.abort()
  }, [productId, ratingSummary, requestKey])

  const currentState = reviewState?.requestKey === requestKey ? reviewState : null

  if (!currentState) {
    return <ProductReviewsSectionFallback summary={ratingSummary} />
  }

  return (
    <div className="space-y-4">
      {currentState.hasError ? (
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
        reviews={currentState.reviews}
      />
    </div>
  )
}
