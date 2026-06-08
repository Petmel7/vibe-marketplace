import type { ReviewDto, ReviewRatingSummaryDto } from '@/features/review/review.dto'
import type { ProductJsonLdDto } from '@/features/seo/seo.dto'
import JsonLd from './JsonLd'

type JsonLdReview = {
  '@type': 'Review'
  author: {
    '@type': 'Person'
    name: string
  }
  reviewRating: {
    '@type': 'Rating'
    ratingValue: number
  }
  reviewBody?: string
  name?: string
  datePublished?: string
}

export default function ProductJsonLd({
  data,
  ratingSummary,
  reviews = [],
}: {
  data: ProductJsonLdDto
  ratingSummary?: ReviewRatingSummaryDto | null
  reviews?: ReviewDto[]
}) {
  const reviewNodes: JsonLdReview[] = reviews
    .filter((review) => review.rating > 0)
    .slice(0, 3)
    .map((review) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: review.userDisplayName?.trim() || 'Покупець',
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
      },
      ...(review.comment ? { reviewBody: review.comment } : {}),
      ...(review.title ? { name: review.title } : {}),
      ...(review.createdAt ? { datePublished: review.createdAt } : {}),
    }))

  const jsonLd = {
    ...data,
    ...(ratingSummary && ratingSummary.totalCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: ratingSummary.averageRating,
            reviewCount: ratingSummary.totalCount,
          },
        }
      : {}),
    ...(reviewNodes.length > 0 ? { review: reviewNodes } : {}),
  }

  return <JsonLd id="product-jsonld" data={jsonLd} />
}
