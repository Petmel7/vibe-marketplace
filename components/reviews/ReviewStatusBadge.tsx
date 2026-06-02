import type { ReviewStatus } from '@/types/reviews'
import { getReviewStatusMeta } from './reviewUtils'

export default function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const meta = getReviewStatusMeta(status)

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  )
}
