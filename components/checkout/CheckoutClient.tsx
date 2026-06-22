'use client'

import Link from 'next/link'
import { useId, useRef, useState } from 'react'
import EmptyState from '@/components/profile/EmptyState'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'
import DashboardCard from '@/components/profile/DashboardCard'
import type { CreateAddressDto } from '@/features/address/address.dto'
import { useCheckout } from '@/hooks/useCheckout'
import CheckoutAddressSelector from './CheckoutAddressSelector'
import CheckoutBlockingIssues from './CheckoutBlockingIssues'
import CheckoutDeliverySection from './CheckoutDeliverySection'
import CheckoutItemList from './CheckoutItemList'
import PaymentMethodSelector from './PaymentMethodSelector'
import CheckoutSubmitButton from './CheckoutSubmitButton'
import CheckoutSummary from './CheckoutSummary'
import LiqPayPaymentHandoff from './LiqPayPaymentHandoff'
import CouponInput from './CouponInput'
import AppliedCouponCard from './AppliedCouponCard'

export default function CheckoutClient({
  initialCartId,
}: {
  initialCartId?: string
}) {
  const privacyConsentHintId = useId()
  const privacyConsentErrorId = useId()
  const privacyConsentRef = useRef<HTMLInputElement | null>(null)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [privacyConsentError, setPrivacyConsentError] = useState<string | null>(null)

  const {
    preview,
    isLoading,
    isSubmitting,
    isPreviewRecalculating,
    isSavingAddress,
    isApplyingCoupon,
    paymentHandoffAction,
    loadError,
    hasLoadedPreviewOnce,
    submitError,
    previewSyncMessage,
    addressError,
    deliveryError,
    paymentMethodError,
    couponCode,
    couponError,
    couponSuccessMessage,
    appliedCouponCode,
    blockingIssues,
    isEmpty,
    isSessionHydrating,
    isAuthCartSyncPending,
    canSubmit,
    selectedAddressId,
    deliveryMode,
    selectedDeliveryType,
    recipientName,
    recipientPhone,
    selectedCity,
    selectedWarehouse,
    recipientStreet,
    recipientBuilding,
    recipientApartment,
    selectedPaymentMethod,
    setSelectedAddressId,
    setDeliveryMode,
    setSelectedDeliveryType,
    setRecipientName,
    setRecipientPhone,
    setSelectedCity,
    setSelectedWarehouse,
    setRecipientStreet,
    setRecipientBuilding,
    setRecipientApartment,
    setSelectedPaymentMethod,
    setCouponCode,
    submitCheckout,
    applyCoupon,
    removeCoupon,
    addAddress,
  } = useCheckout(initialCartId)

  const handleAddAddress = async (payload: CreateAddressDto) => addAddress(payload)

  const handlePrivacyConsentChange = (checked: boolean) => {
    setAcceptedPrivacy(checked)

    if (checked) {
      setPrivacyConsentError(null)
    }
  }

  const handleSubmitCheckout = () => {
    if (!acceptedPrivacy) {
      setPrivacyConsentError('Підтвердьте згоду на обробку персональних даних.')
      privacyConsentRef.current?.focus()
      return
    }

    setPrivacyConsentError(null)
    void submitCheckout({ acceptedPrivacy: true })
  }

  if (isLoading || (!hasLoadedPreviewOnce && !loadError) || (isSessionHydrating && (!preview || isEmpty))) {
    return (
      <div
        className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]"
        aria-busy="true"
        data-testid="checkout-loading-state"
      >
        <div className="space-y-6">
          <div className="ui-elevated-panel h-72 animate-pulse bg-panel/60" />
          <div className="ui-elevated-panel h-64 animate-pulse bg-panel/60" />
        </div>
        <div className="ui-elevated-panel h-64 animate-pulse bg-panel/60" />
      </div>
    )
  }

  if (loadError) {
    return (
      <ProtectedRouteState
        title="Checkout preview unavailable"
        description={loadError}
        actionHref="/cart"
        actionLabel="Back to cart"
      />
    )
  }

  if (isAuthCartSyncPending && (!preview || isEmpty)) {
    return (
      <ProtectedRouteState
        title="Синхронізуємо кошик..."
        description="Зачекайте, поки ми об'єднаємо гостьовий кошик і оновимо оформлення замовлення."
        actionHref="/cart"
        actionLabel="Повернутися до кошика"
      />
    )
  }

  if (!preview || isEmpty) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Add products to the cart before continuing to checkout."
        actionHref="/catalog"
        actionLabel="Browse catalog"
      />
    )
  }

  if (paymentHandoffAction) {
    return <LiqPayPaymentHandoff action={paymentHandoffAction} />
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
      <div className="space-y-6">
        <CheckoutBlockingIssues issues={blockingIssues} />
        <CheckoutItemList items={preview.items} />
        <PaymentMethodSelector
          value={selectedPaymentMethod}
          onChange={setSelectedPaymentMethod}
          disabled={isSubmitting}
          errorMessage={paymentMethodError}
        />
        <CheckoutDeliverySection
          deliveryMode={deliveryMode}
          onDeliveryModeChange={setDeliveryMode}
          selectedDeliveryType={selectedDeliveryType}
          onDeliveryTypeChange={setSelectedDeliveryType}
          recipientName={recipientName}
          recipientPhone={recipientPhone}
          selectedCity={selectedCity}
          selectedWarehouse={selectedWarehouse}
          recipientStreet={recipientStreet}
          recipientBuilding={recipientBuilding}
          recipientApartment={recipientApartment}
          onRecipientNameChange={setRecipientName}
          onRecipientPhoneChange={setRecipientPhone}
          onCityChange={setSelectedCity}
          onWarehouseChange={setSelectedWarehouse}
          onRecipientStreetChange={setRecipientStreet}
          onRecipientBuildingChange={setRecipientBuilding}
          onRecipientApartmentChange={setRecipientApartment}
          deliverySelection={preview.deliverySelection}
          hasSavedAddresses={preview.addressOptions.length > 0}
        />
        {deliveryMode === 'ADDRESS' ? (
          <CheckoutAddressSelector
            addresses={preview.addressOptions}
            selectedAddressId={selectedAddressId}
            onSelect={setSelectedAddressId}
            onAddAddress={handleAddAddress}
            isSaving={isSavingAddress}
            errorMessage={addressError}
          />
        ) : deliveryError ? (
          <p className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
            {deliveryError}
          </p>
        ) : null}
      </div>

      <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
        <DashboardCard
          title="Coupon"
          description="Apply a marketplace coupon and refresh totals from the backend before placing the order."
        >
          <div className="space-y-4">
            <CouponInput
              value={couponCode}
              onChange={setCouponCode}
              onApply={() => {
                void applyCoupon()
              }}
              disabled={isSubmitting}
              isApplying={isApplyingCoupon}
              errorMessage={couponError}
              successMessage={couponSuccessMessage}
            />

            {preview.appliedPromotion ? (
              <AppliedCouponCard
                promotion={preview.appliedPromotion}
                removable={Boolean(appliedCouponCode)}
                disabled={isSubmitting || isApplyingCoupon}
                onRemove={() => {
                  void removeCoupon()
                }}
              />
            ) : null}
          </div>
        </DashboardCard>

        <CheckoutSummary preview={preview} paymentMethod={selectedPaymentMethod} />
        <DashboardCard
          title="Підтвердження"
          description="Під час оформлення сервер ще раз перевірить наявність товарів, актуальні ціни, адресу доставки та обраний спосіб оплати."
        >
          <div className="space-y-4">
            <CheckoutSubmitButton
              disabled={!canSubmit}
              isSubmitting={isSubmitting}
              paymentMethod={selectedPaymentMethod}
              onSubmit={handleSubmitCheckout}
            />

            {isPreviewRecalculating ? (
              <p
                className="rounded-2xl border border-brand-accent/20 bg-brand-accent/10 px-4 py-3 text-sm text-copy-primary"
                aria-live="polite"
              >
                Updating checkout total with the latest shipping estimate...
              </p>
            ) : null}

            {previewSyncMessage ? (
              <p
                className="rounded-2xl border border-brand-accent/20 bg-brand-accent/10 px-4 py-3 text-sm text-copy-primary"
                aria-live="polite"
              >
                {previewSyncMessage}
              </p>
            ) : null}

            <div className="rounded-2xl border border-panelBorder bg-panelAlt/70 px-4 py-3">
              <div className="flex items-start gap-3">
                <input
                  ref={privacyConsentRef}
                  id="checkout-privacy-consent"
                  type="checkbox"
                  checked={acceptedPrivacy}
                  onChange={(event) => {
                    handlePrivacyConsentChange(event.target.checked)
                  }}
                  aria-invalid={privacyConsentError ? 'true' : 'false'}
                  aria-describedby={
                    privacyConsentError
                      ? `${privacyConsentHintId} ${privacyConsentErrorId}`
                      : privacyConsentHintId
                  }
                  className="mt-0.5 h-4 w-4 rounded border border-panelBorder text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                />

                <div className="space-y-1">
                  <p
                    id={privacyConsentHintId}
                    className="text-sm text-copy-secondary"
                  >
                    Я погоджуюся з умовами обробки{' '}
                    <Link
                      href="/privacy"
                      className="text-brand-accent underline underline-offset-2 hover:text-copy-strong"
                    >
                      персональних даних
                    </Link>
                    .
                  </p>

                  {privacyConsentError ? (
                    <p
                      id={privacyConsentErrorId}
                      className="text-sm text-brand-danger"
                      aria-live="polite"
                    >
                      {privacyConsentError}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {submitError ? (
              <p className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
                {submitError}
              </p>
            ) : null}
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}
