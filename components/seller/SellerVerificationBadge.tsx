import SellerStatusBadge from '@/components/seller/SellerStatusBadge'
import type { SellerOnboardingState } from '@/types/seller'

const BADGE_COPY: Record<
  SellerOnboardingState,
  { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }
> = {
  BUYER: { label: 'Buyer account', tone: 'info' },
  PENDING_VERIFICATION: { label: 'Pending verification', tone: 'warning' },
  VERIFIED: { label: 'Verified seller', tone: 'success' },
  REJECTED: { label: 'Application rejected', tone: 'danger' },
  SUSPENDED: { label: 'Seller suspended', tone: 'danger' },
}

export default function SellerVerificationBadge({
  state,
}: {
  state: SellerOnboardingState
}) {
  const config = BADGE_COPY[state]

  return <SellerStatusBadge label={config.label} tone={config.tone} />
}
