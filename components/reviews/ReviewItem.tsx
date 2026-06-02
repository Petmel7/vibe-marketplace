import type { ReactNode } from 'react'
import type { ProductReview } from '@/types/reviews'
import ReviewStars from './ReviewStars'
import { formatReviewDate } from './reviewUtils'

export default function ReviewItem({
  review,
  showProductMeta = false,
  action,
}: {
  review: ProductReview
  showProductMeta?: boolean
  action?: ReactNode
}) {
  return (
    <article className="rounded-[28px] border border-panelBorder bg-panel px-5 py-5 shadow-sm sm:px-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-base font-semibold text-copy-strong">
                {review.title || review.userDisplayName || 'Відгук покупця'}
              </h3>
              {review.isVerifiedPurchase ? (
                <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                  Підтверджена покупка
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-copy-muted">
              <ReviewStars rating={review.rating} />
              <span>{review.userDisplayName || 'Покупець маркетплейсу'}</span>
              <span>{formatReviewDate(review.createdAt)}</span>
            </div>
            {showProductMeta ? (
              <p className="text-sm text-copy-secondary">
                {review.productName} · {review.storeName}
              </p>
            ) : null}
          </div>
          {action}
        </div>

        {review.comment ? <p className="text-sm leading-6 text-copy-primary">{review.comment}</p> : null}

        {(review.pros || review.cons) ? (
          <dl className="grid gap-3 md:grid-cols-2">
            {review.pros ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-200">Плюси</dt>
                <dd className="mt-2 text-sm text-copy-primary">{review.pros}</dd>
              </div>
            ) : null}
            {review.cons ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-[0.2em] text-rose-200">Мінуси</dt>
                <dd className="mt-2 text-sm text-copy-primary">{review.cons}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {review.sellerReply ? (
          <div className="rounded-2xl border border-brand-accent/20 bg-brand-accent/5 px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-accent">
              Відповідь продавця
            </p>
            <p className="mt-2 text-sm leading-6 text-copy-primary">{review.sellerReply}</p>
            {review.sellerRepliedAt ? (
              <p className="mt-3 text-xs text-copy-muted">{formatReviewDate(review.sellerRepliedAt)}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}
