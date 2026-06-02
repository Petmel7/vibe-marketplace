'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { replyToReview } from './reviewApi'

export default function SellerReviewReplyForm({
  reviewId,
  initialValue,
}: {
  reviewId: string
  initialValue?: string | null
}) {
  const router = useRouter()
  const [reply, setReply] = useState(initialValue ?? '')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    startTransition(async () => {
      try {
        await replyToReview(reviewId, reply)
        setSuccessMessage('Відповідь продавця збережено.')
        router.refresh()
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Не вдалося зберегти відповідь продавця.',
        )
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="space-y-2">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-copy-muted">
          Відповідь продавця
        </span>
        <textarea
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          className="min-h-24 w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
          placeholder="Подякуйте за відгук або уточніть деталі для покупця"
          maxLength={3000}
        />
      </label>

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
        disabled={isPending || !reply.trim()}
        className="ui-secondary-button disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Зберігаємо...' : initialValue ? 'Оновити відповідь' : 'Додати відповідь'}
      </button>
    </form>
  )
}
