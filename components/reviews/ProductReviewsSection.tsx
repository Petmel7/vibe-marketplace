'use client'

import { useContext } from 'react'
import type { SessionUser } from '@/types/auth'
import type { ProductReviewList, ReviewRatingSummary } from '@/types/reviews'
import ReportButton from '@/components/abuse-reports/ReportButton'
import { AuthSessionContext } from '@/components/auth/AuthSessionProvider'
import ReviewEmptyState from './ReviewEmptyState'
import ReviewList from './ReviewList'
import ReviewSummaryCard from './ReviewSummaryCard'
import ProductReviewForm from './ProductReviewForm'

function hasBuyerRole(user: SessionUser | null) {
  return Boolean(user?.roles.includes('BUYER'))
}

export default function ProductReviewsSection({
  productId,
  productName,
  ratingSummary,
  reviews,
  currentUser,
}: {
  productId: string
  productName: string
  ratingSummary: ReviewRatingSummary
  reviews: ProductReviewList
  currentUser?: SessionUser | null
}) {
  const authSession = useContext(AuthSessionContext)
  const resolvedCurrentUser = currentUser ?? authSession?.user ?? null
  const ownPublishedReview = resolvedCurrentUser
    ? reviews.items.find((review) => review.userId === resolvedCurrentUser.id) ?? null
    : null

  const canShowForm = hasBuyerRole(resolvedCurrentUser)

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-copy-muted">Reviews</p>
        <h2 className="ui-heading-page text-3xl">Відгуки та оцінки</h2>
        <p className="max-w-3xl text-sm text-copy-secondary">
          Оцінки та текстові відгуки допомагають покупцям зрозуміти реальний досвід з товаром {productName}.
        </p>
      </div>

      <ReviewSummaryCard summary={ratingSummary} />

      {resolvedCurrentUser ? (
        canShowForm ? (
          <ProductReviewForm
            productId={productId}
            review={ownPublishedReview}
            canWrite
            helperText={
              ownPublishedReview
                ? 'Ви можете оновити свій опублікований відгук. Після змін він знову потрапить на модерацію.'
                : 'Відгуки доступні покупцям після замовлення. Маркетплейс перевірить eligibility під час збереження.'
            }
          />
        ) : null
      ) : (
        <ReviewEmptyState
          title="Увійдіть, щоб залишити відгук"
          description="Після входу buyer-акаунт зможе надіслати відгук про товар, якщо покупка вже підтверджена маркетплейсом."
          actionHref="/login"
          actionLabel="Увійти"
        />
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-copy-strong">Що кажуть покупці</h3>
          {reviews.total > 0 ? (
            <p className="text-sm text-copy-muted">
              {reviews.total} {reviews.total === 1 ? 'опублікований відгук' : reviews.total < 5 ? 'опубліковані відгуки' : 'опублікованих відгуків'}
            </p>
          ) : null}
        </div>

        <ReviewList
          reviews={reviews.items}
          renderAction={(review) =>
            review.userId !== resolvedCurrentUser?.id ? (
              <ReportButton
                currentUser={resolvedCurrentUser}
                targetType="REVIEW"
                targetId={review.id}
                triggerLabel="Поскаржитися"
                triggerClassName="ui-secondary-button"
                title="Поскаржитися на відгук"
              />
            ) : null
          }
          emptyState={
            <ReviewEmptyState
              title="Поки що немає опублікованих відгуків"
              description="Коли з’являться перші перевірені відгуки, вони відобразяться тут разом із зірковим рейтингом."
            />
          }
        />
      </div>
    </section>
  )
}
