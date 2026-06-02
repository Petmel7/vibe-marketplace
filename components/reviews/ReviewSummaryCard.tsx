import type { ReviewRatingSummary } from '@/types/reviews'
import ReviewStars from './ReviewStars'
import { getRatingDistribution } from './reviewUtils'

export default function ReviewSummaryCard({ summary }: { summary: ReviewRatingSummary }) {
  const distribution = getRatingDistribution(summary)

  return (
    <section className="ui-elevated-panel p-5 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.32fr)_minmax(0,0.68fr)] lg:items-center">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-copy-muted">Рейтинг товару</p>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-semibold leading-none text-copy-strong">
              {summary.averageRating.toFixed(1)}
            </span>
            <span className="pb-1 text-sm text-copy-muted">/ 5</span>
          </div>
          <ReviewStars rating={Math.round(summary.averageRating)} size={20} />
          <p className="text-sm text-copy-secondary">
            {summary.totalCount} {summary.totalCount === 1 ? 'відгук' : summary.totalCount < 5 ? 'відгуки' : 'відгуків'}
          </p>
        </div>

        <div className="space-y-3">
          {distribution.map((entry) => (
            <div key={entry.stars} className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
              <span className="text-copy-secondary">{entry.stars} ★</span>
              <div className="h-2 overflow-hidden rounded-full bg-panelAlt">
                <div
                  className="h-full rounded-full bg-brand-accent transition-[width]"
                  style={{ width: `${entry.percentage}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-right text-copy-muted">{entry.count}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
