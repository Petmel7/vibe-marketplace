import {
  API_ROUTES,
  getAdminReviewModerateRoute,
  getProductReviewsRoute,
  getReviewRoute,
  getSellerReviewReplyRoute,
} from '@/lib/constants/apiRoutes'
import type { AdminReviewList, ProductReview, ProductReviewList, ReviewFormInput, ReviewModerationAction } from '@/types/reviews'

type ApiSuccess<T> = { success: true; data: T }
type ApiFailure = { success: false; error: { message: string; code: string } }

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiSuccess<T> | ApiFailure

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? 'Запит не вдався.' : payload.error.message)
  }

  return payload.data
}

export async function createProductReview(productId: string, input: ReviewFormInput) {
  const response = await fetch(getProductReviewsRoute(productId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  return parseApiResponse<ProductReview>(response)
}

export async function updateReview(reviewId: string, input: Partial<ReviewFormInput>) {
  const response = await fetch(getReviewRoute(reviewId), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  return parseApiResponse<ProductReview>(response)
}

export async function deleteReview(reviewId: string) {
  const response = await fetch(getReviewRoute(reviewId), {
    method: 'DELETE',
  })

  return parseApiResponse<{ id: string }>(response)
}

export async function replyToReview(reviewId: string, sellerReply: string) {
  const response = await fetch(getSellerReviewReplyRoute(reviewId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sellerReply }),
  })

  return parseApiResponse<ProductReview>(response)
}

export async function moderateReview(reviewId: string, input: {
  action: ReviewModerationAction
  moderationReason?: string
}) {
  const response = await fetch(getAdminReviewModerateRoute(reviewId), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  return parseApiResponse<ProductReview>(response)
}

export async function fetchProductReviews(productId: string) {
  const response = await fetch(getProductReviewsRoute(productId), {
    cache: 'no-store',
  })

  return parseApiResponse<ProductReviewList>(response)
}

export async function fetchAdminReviews(params?: URLSearchParams) {
  const response = await fetch(
    params?.size ? `${API_ROUTES.adminReviews}?${params.toString()}` : API_ROUTES.adminReviews,
    {
      cache: 'no-store',
    },
  )

  return parseApiResponse<AdminReviewList>(response)
}
