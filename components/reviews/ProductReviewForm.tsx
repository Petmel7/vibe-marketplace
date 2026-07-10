'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ProductReview, ReviewFormInput } from '@/types/reviews'
import { createProductReview, deleteReview, updateReview } from './reviewApi'
import ReviewStars from './ReviewStars'

function normalizeText(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function getInitialState(review?: ProductReview | null) {
  return {
    rating: review?.rating ?? 5,
    title: review?.title ?? '',
    comment: review?.comment ?? '',
    pros: review?.pros ?? '',
    cons: review?.cons ?? '',
  }
}

export default function ProductReviewForm({
  productId,
  review,
  canWrite,
  helperText,
}: {
  productId: string
  review?: ProductReview | null
  canWrite: boolean
  helperText?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState(() => getInitialState(review))
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const isEditing = Boolean(review)

  function buildPayload(): ReviewFormInput {
    return {
      rating: form.rating,
      title: form.title.trim() || undefined,
      comment: normalizeText(form.comment),
      pros: normalizeText(form.pros),
      cons: normalizeText(form.cons),
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canWrite) {
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)

    startTransition(async () => {
      try {
        if (isEditing && review) {
          await updateReview(review.id, buildPayload())
          setSuccessMessage('Відгук оновлено. Після повторної модерації він знову з’явиться на сторінці товару.')
        } else {
          await createProductReview(productId, buildPayload())
          setSuccessMessage('Дякуємо! Відгук надіслано на модерацію.')
        }

        router.refresh()
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Не вдалося зберегти відгук. Спробуйте ще раз.',
        )
      }
    })
  }

  function handleDelete() {
    if (!review) {
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)

    startTransition(async () => {
      try {
        await deleteReview(review.id)
        setSuccessMessage('Відгук видалено.')
        router.refresh()
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Не вдалося видалити відгук. Спробуйте ще раз.',
        )
      }
    })
  }

  return (
    <section className="ui-elevated-panel p-5 sm:p-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-copy-strong">
          {isEditing ? 'Ваш відгук' : 'Напишіть відгук'}
        </h3>
        <p className="text-sm text-copy-muted">
          {helperText ??
            'Оцінка, плюси та мінуси допоможуть іншим покупцям краще зрозуміти товар.'}
        </p>
      </div>

      {!canWrite ? (
        <p className="mt-5 rounded-2xl border border-panelBorder bg-panel px-4 py-3 text-sm text-copy-secondary">
          Відгук можна залишити після покупки товару з вашого акаунта покупця. Остаточну доступність перевіряє маркетплейс під час відправлення форми.
        </p>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-copy-strong">Оцінка</label>
            <ReviewStars
              rating={form.rating}
              interactive
              onChange={(rating) => setForm((current) => ({ ...current, rating }))}
              label="Оберіть оцінку від 1 до 5"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-copy-strong">Заголовок</span>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
                maxLength={200}
                placeholder="Короткий підсумок"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-copy-strong">Плюси</span>
              <input
                value={form.pros}
                onChange={(event) => setForm((current) => ({ ...current, pros: event.target.value }))}
                className="w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
                maxLength={2000}
                placeholder="Що сподобалося найбільше"
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-copy-strong">Коментар</span>
            <textarea
              value={form.comment}
              onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))}
              className="min-h-32 w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
              maxLength={2000}
              placeholder="Опишіть свій досвід із товаром"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-copy-strong">Мінуси</span>
            <textarea
              value={form.cons}
              onChange={(event) => setForm((current) => ({ ...current, cons: event.target.value }))}
              className="min-h-24 w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
              maxLength={2000}
              placeholder="Що можна покращити"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary" aria-live="polite">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-2xl border border-brand-success/30 bg-brand-success/10 px-4 py-3 text-sm text-copy-primary" aria-live="polite">
              {successMessage}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={isPending}
              className="ui-primary-button disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Зберігаємо...' : isEditing ? 'Оновити відгук' : 'Надіслати відгук'}
            </button>

            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="ui-secondary-button disabled:cursor-not-allowed disabled:opacity-60"
              >
                Видалити відгук
              </button>
            ) : null}
          </div>
        </form>
      )}
    </section>
  )
}
