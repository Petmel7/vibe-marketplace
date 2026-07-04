import type { ReviewRatingSummary } from '@/types/reviews'
import ReviewSummaryCard from './ReviewSummaryCard'

export default function ProductReviewsSectionFallback({
  summary,
}: {
  summary: ReviewRatingSummary
}) {
  return (
    <section className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-copy-muted">Reviews</p>
        <h2 className="ui-heading-page text-3xl">Відгуки та оцінки</h2>
        <p className="max-w-3xl text-sm text-copy-secondary">
          Завантажуємо відгуки покупців і детальну статистику по цьому товару.
        </p>
      </div>

      <ReviewSummaryCard summary={summary} />

      <div className="space-y-4 rounded-[28px] border border-panelBorder bg-panel/60 p-6">
        <div className="h-5 w-40 animate-pulse rounded bg-panelAlt" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="space-y-3 rounded-2xl border border-panelBorder bg-panel px-5 py-4"
            >
              <div className="h-4 w-32 animate-pulse rounded bg-panelAlt" />
              <div className="h-3 w-full animate-pulse rounded bg-panelAlt" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-panelAlt" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
