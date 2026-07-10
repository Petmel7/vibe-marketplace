'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'
import EmptyState from '@/components/profile/EmptyState'
import DashboardCard from '@/components/profile/DashboardCard'
import type { CreateAddressDto } from '@/features/address/address.dto'
import { useCheckout } from '@/hooks/useCheckout'
import AppliedCouponCard from './AppliedCouponCard'
import CheckoutAddressSelector from './CheckoutAddressSelector'
import CheckoutBlockingIssues from './CheckoutBlockingIssues'
import CheckoutDeliverySection from './CheckoutDeliverySection'
import CheckoutItemList from './CheckoutItemList'
import CheckoutSubmitButton from './CheckoutSubmitButton'
import CheckoutSummary from './CheckoutSummary'
import CouponInput from './CouponInput'
import LiqPayPaymentHandoff from './LiqPayPaymentHandoff'
import PaymentMethodSelector from './PaymentMethodSelector'

const CHECKOUT_PRIVACY_CONSENT_STORAGE_KEY = 'checkout:privacy-consent:v1'

export default function CheckoutClient({
  initialCartId,
}: {
  initialCartId?: string
}) {
  const privacyConsentHintId = useId()
  const privacyConsentErrorId = useId()
  const privacyConsentRef = useRef<HTMLInputElement | null>(null)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem(CHECKOUT_PRIVACY_CONSENT_STORAGE_KEY) === 'true'
  })
  const [privacyConsentError, setPrivacyConsentError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (acceptedPrivacy) {
      window.localStorage.setItem(CHECKOUT_PRIVACY_CONSENT_STORAGE_KEY, 'true')
      return
    }

    window.localStorage.removeItem(CHECKOUT_PRIVACY_CONSENT_STORAGE_KEY)
  }, [acceptedPrivacy])

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
    blockingIssues,
    isEmpty,
    isSessionHydrating,
    isAuthCartSyncPending,
    canSubmit,
    selectedAddressId,
    deliveryMode,
    selectedDeliveryType,
    recipientFirstName,
    recipientLastName,
    recipientMiddleName,
    recipientFirstNameError,
    recipientLastNameError,
    recipientMiddleNameError,
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
    setRecipientFirstName,
    setRecipientLastName,
    setRecipientMiddleName,
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

  const handleSubmitCheckout = async () => {
    if (!acceptedPrivacy) {
      setPrivacyConsentError('Підтвердіть згоду на обробку персональних даних.')
      privacyConsentRef.current?.focus()
      return
    }

    setPrivacyConsentError(null)
    const result = await submitCheckout({ acceptedPrivacy: true })

    if (result && typeof window !== 'undefined') {
      window.localStorage.removeItem(CHECKOUT_PRIVACY_CONSENT_STORAGE_KEY)
      setAcceptedPrivacy(false)
    }
  }

  if (
    (isLoading && !preview) ||
    (!hasLoadedPreviewOnce && !loadError) ||
    (isSessionHydrating && (!preview || isEmpty))
  ) {
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
        title="Попередній перегляд оформлення недоступний"
        description={loadError}
        actionHref="/cart"
        actionLabel="Повернутися до кошика"
      />
    )
  }

  if (isAuthCartSyncPending && (!preview || isEmpty)) {
    return (
      <ProtectedRouteState
        title="Синхронізуємо кошик..."
        description="Зачекайте, поки ми об’єднаємо гостьовий кошик і оновимо оформлення замовлення."
        actionHref="/cart"
        actionLabel="Повернутися до кошика"
      />
    )
  }

  if (!preview || isEmpty) {
    return (
      <EmptyState
        title="Ваш кошик порожній"
        description="Додайте товари в кошик перед переходом до оформлення замовлення."
        actionHref="/catalog"
        actionLabel="Перейти до каталогу"
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
          recipientFirstName={recipientFirstName}
          recipientLastName={recipientLastName}
          recipientMiddleName={recipientMiddleName}
          recipientFirstNameError={recipientFirstNameError}
          recipientLastNameError={recipientLastNameError}
          recipientMiddleNameError={recipientMiddleNameError}
          recipientPhone={recipientPhone}
          selectedCity={selectedCity}
          selectedWarehouse={selectedWarehouse}
          recipientStreet={recipientStreet}
          recipientBuilding={recipientBuilding}
          recipientApartment={recipientApartment}
          onRecipientFirstNameChange={setRecipientFirstName}
          onRecipientLastNameChange={setRecipientLastName}
          onRecipientMiddleNameChange={setRecipientMiddleName}
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

      <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <CouponInput
          value={couponCode}
          onChange={setCouponCode}
          onApply={applyCoupon}
          disabled={isApplyingCoupon || isSubmitting || !preview.cartId}
          isApplying={isApplyingCoupon}
          errorMessage={couponError}
          successMessage={couponSuccessMessage}
        />
        {preview.appliedPromotion ? (
          <AppliedCouponCard
            promotion={preview.appliedPromotion}
            onRemove={removeCoupon}
            removable
            disabled={isApplyingCoupon || isSubmitting}
          />
        ) : null}
        <CheckoutSummary preview={preview} paymentMethod={selectedPaymentMethod} />
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
                onChange={(event) => handlePrivacyConsentChange(event.target.checked)}
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
              onSubmit={handleSubmitCheckout}
              disabled={!canSubmit || isSubmitting}
              isSubmitting={isSubmitting}
              paymentMethod={selectedPaymentMethod}
            />
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}
