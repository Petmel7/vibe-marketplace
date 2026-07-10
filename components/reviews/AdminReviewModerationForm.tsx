'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ProductReview, ReviewModerationAction } from '@/types/reviews'
import { moderateReview } from './reviewApi'
import { getReviewModerationActionLabel } from './reviewUtils'
import ReviewStatusBadge from './ReviewStatusBadge'

const ACTIONS: ReviewModerationAction[] = ['approve', 'reject', 'hide', 'restore']

export default function AdminReviewModerationForm({ review }: { review: ProductReview }) {
  const router = useRouter()
  const [selectedAction, setSelectedAction] = useState<ReviewModerationAction>('approve')
  const [reason, setReason] = useState(review.moderationReason ?? '')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    startTransition(async () => {
      try {
        await moderateReview(review.id, {
          action: selectedAction,
          moderationReason: reason.trim() || undefined,
        })
        setSuccessMessage('Статус відгуку оновлено.')
        router.refresh()
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Не вдалося оновити статус модерації відгуку.',
        )
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <ReviewStatusBadge status={review.status} />
        <span className="text-xs text-copy-muted">Поточний статус</span>
      </div>

      <label className="space-y-2">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-copy-muted">
          Дія модерації
        </span>
        <select
          value={selectedAction}
          onChange={(event) => setSelectedAction(event.target.value as ReviewModerationAction)}
          className="w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
        >
          {ACTIONS.map((action) => (
            <option key={action} value={action}>
              {getReviewModerationActionLabel(action)}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-copy-muted">
          Причина модерації
        </span>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="min-h-24 w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
          placeholder="Додайте причину для відхилення або приховування"
          maxLength={2000}
        />
      </label>

      {review.moderationReason ? (
        <p className="rounded-2xl border border-panelBorder bg-panel px-4 py-3 text-sm text-copy-secondary">
          Поточна причина: {review.moderationReason}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-2xl border border-brand-success/30 bg-brand-success/10 px-4 py-3 text-sm text-copy-primary">
          {successMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="ui-secondary-button disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Оновлюємо...' : 'Застосувати дію'}
      </button>
    </form>
  )
}
