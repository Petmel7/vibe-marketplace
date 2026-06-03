import SellerStatusBadge from '@/components/seller/SellerStatusBadge'
import { getLedgerEntryStatusLabel, type LedgerEntryStatus } from '@/types/payouts'

const STATUS_TONES: Record<LedgerEntryStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'warning',
  AVAILABLE: 'success',
  PAID_OUT: 'info',
  CANCELLED: 'danger',
}

export default function LedgerEntryStatusBadge({ status }: { status: LedgerEntryStatus }) {
  return <SellerStatusBadge label={getLedgerEntryStatusLabel(status)} tone={STATUS_TONES[status]} />
}
