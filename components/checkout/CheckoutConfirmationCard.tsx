import Link from 'next/link'
import type { RefObject } from 'react'
import DashboardCard from '@/components/profile/DashboardCard'
import type { CheckoutPaymentMethod } from '@/types/payments'
import CheckoutSubmitButton from './CheckoutSubmitButton'

export default function CheckoutConfirmationCard({
  acceptedPrivacy,
  privacyConsentRef,
  privacyConsentHintId,
  privacyConsentErrorId,
  privacyConsentError,
  previewSyncMessage,
  isPreviewRecalculating,
  submitError,
  canSubmit,
  isSubmitting,
  selectedPaymentMethod,
  onPrivacyConsentChange,
  onSubmit,
}: {
  acceptedPrivacy: boolean
  privacyConsentRef: RefObject<HTMLInputElement | null>
  privacyConsentHintId: string
  privacyConsentErrorId: string
  privacyConsentError: string | null
  previewSyncMessage: string | null
  isPreviewRecalculating: boolean
  submitError: string | null
  canSubmit: boolean
  isSubmitting: boolean
  selectedPaymentMethod: CheckoutPaymentMethod
  onPrivacyConsentChange: (checked: boolean) => void
  onSubmit: () => void
}) {
  return (
    <DashboardCard
      title="Підтвердження"
      description="Перед оформленням замовлення підтвердіть згоду на обробку персональних даних."
    >
      <div className="space-y-4">
        <label className="flex items-start gap-3 text-sm text-copy-primary">
          <input
            ref={privacyConsentRef}
            type="checkbox"
            checked={acceptedPrivacy}
            onChange={(event) => onPrivacyConsentChange(event.target.checked)}
            className="mt-1 h-4 w-4"
            aria-invalid={privacyConsentError ? true : undefined}
            aria-describedby={
              privacyConsentError ? privacyConsentErrorId : privacyConsentHintId
            }
          />
          <span>
            Я погоджуюся з умовами обробки{' '}
            <Link href="/privacy" className="ui-link">
              персональних даних
            </Link>
            .
          </span>
        </label>

        <p id={privacyConsentHintId} className="text-xs text-copy-muted">
          Ми використовуємо ці дані лише для оформлення, оплати та доставки замовлення.
        </p>

        {privacyConsentError ? (
          <p
            id={privacyConsentErrorId}
            className="text-sm text-brand-danger"
            role="alert"
          >
            {privacyConsentError}
          </p>
        ) : null}

        {previewSyncMessage ? (
          <p className="text-sm text-copy-muted">{previewSyncMessage}</p>
        ) : isPreviewRecalculating ? (
          <p className="text-sm text-copy-muted">
            Оновлюємо підсумок замовлення з актуальною оцінкою доставки...
          </p>
        ) : null}

        {submitError ? (
          <p className="text-sm text-brand-danger" role="alert">
            {submitError}
          </p>
        ) : null}

        <CheckoutSubmitButton
          onSubmit={onSubmit}
          disabled={!canSubmit || isSubmitting}
          isSubmitting={isSubmitting}
          paymentMethod={selectedPaymentMethod}
        />
      </div>
    </DashboardCard>
  )
}
