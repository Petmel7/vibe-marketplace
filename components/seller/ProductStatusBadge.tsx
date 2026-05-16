import SellerStatusBadge from '@/components/seller/SellerStatusBadge'
import type { SellerProductStatus } from '@/types/seller'

const PRODUCT_STATUS_LABELS: Record<SellerProductStatus, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending review',
  PUBLISHED: 'Published',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived',
}

const PRODUCT_STATUS_TONES: Record<SellerProductStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  DRAFT: 'neutral',
  PENDING_REVIEW: 'warning',
  PUBLISHED: 'success',
  REJECTED: 'danger',
  ARCHIVED: 'info',
}

export default function ProductStatusBadge({ status }: { status: SellerProductStatus }) {
  return <SellerStatusBadge label={PRODUCT_STATUS_LABELS[status]} tone={PRODUCT_STATUS_TONES[status]} />
}
