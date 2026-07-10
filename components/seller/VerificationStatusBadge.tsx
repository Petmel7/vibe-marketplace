import SellerStatusBadge from '@/components/seller/SellerStatusBadge'
import type { SellerVerificationStatus } from '@/types/seller'

const VERIFICATION_LABELS: Record<SellerVerificationStatus, string> = {
  PENDING: 'Очікує верифікації',
  VERIFIED: 'Верифіковано',
  REJECTED: 'Відхилено',
  SUSPENDED: 'Призупинено',
}

const VERIFICATION_TONES: Record<SellerVerificationStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  SUSPENDED: 'danger',
}

export default function VerificationStatusBadge({
  status,
}: {
  status: SellerVerificationStatus
}) {
  return <SellerStatusBadge label={VERIFICATION_LABELS[status]} tone={VERIFICATION_TONES[status]} />
}
