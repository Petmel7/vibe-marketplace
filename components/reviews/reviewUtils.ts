import type { ReviewModerationAction, ReviewRatingSummary, ReviewStatus } from '@/types/reviews'

export function formatReviewDate(value: string) {
  return new Date(value).toLocaleDateString('uk-UA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function getReviewStatusMeta(status: ReviewStatus) {
  switch (status) {
    case 'PENDING':
      return {
        label: 'На модерації',
        className: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
      }
    case 'PUBLISHED':
      return {
        label: 'Опубліковано',
        className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
      }
    case 'REJECTED':
      return {
        label: 'Відхилено',
        className: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
      }
    case 'HIDDEN':
      return {
        label: 'Приховано',
        className: 'border-slate-400/30 bg-slate-400/10 text-slate-200',
      }
  }
}

export function getReviewModerationActionLabel(action: ReviewModerationAction) {
  switch (action) {
    case 'approve':
      return 'Схвалити'
    case 'reject':
      return 'Відхилити'
    case 'hide':
      return 'Приховати'
    case 'restore':
      return 'Відновити'
  }
}

export function getRatingDistribution(summary: ReviewRatingSummary) {
  const entries = [
    { stars: 5, count: summary.rating5Count },
    { stars: 4, count: summary.rating4Count },
    { stars: 3, count: summary.rating3Count },
    { stars: 2, count: summary.rating2Count },
    { stars: 1, count: summary.rating1Count },
  ]

  return entries.map((entry) => ({
    ...entry,
    percentage: summary.totalCount > 0 ? Math.round((entry.count / summary.totalCount) * 100) : 0,
  }))
}
