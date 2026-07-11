import SellerStatusBadge from '@/components/seller/SellerStatusBadge'
import type { SellerOnboardingState } from '@/types/seller'

const BADGE_COPY: Record<
  SellerOnboardingState,
  { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }
> = {
  BUYER: { label: 'Акаунт покупця', tone: 'info' },
  PENDING_VERIFICATION: { label: 'Очікує верифікації', tone: 'warning' },
  VERIFIED_NO_STORE: { label: 'Верифіковано, потрібне налаштування магазину', tone: 'warning' },
  STORE_READY: { label: 'Магазин готовий', tone: 'success' },
  REJECTED: { label: 'Заявку відхилено', tone: 'danger' },
  SUSPENDED: { label: 'Продавця призупинено', tone: 'danger' },
}

export default function SellerVerificationBadge({
  state,
}: {
  state: SellerOnboardingState
}) {
  const config = BADGE_COPY[state]

  return <SellerStatusBadge label={config.label} tone={config.tone} />
}
