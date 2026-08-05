'use client'

import ProtectedRouteState from '@/components/auth/ProtectedRouteState'
import EmptyState from '@/components/profile/EmptyState'
import type { CreateAddressDto } from '@/features/address/address.dto'
import { useCheckout } from '@/hooks/useCheckout'
import AppliedCouponCard from './AppliedCouponCard'
import CheckoutAddressSelector from './CheckoutAddressSelector'
import CheckoutBlockingIssues from './CheckoutBlockingIssues'
import CheckoutConfirmationCard from './CheckoutConfirmationCard'
import CheckoutDeliverySection from './CheckoutDeliverySection'
import CheckoutItemList from './CheckoutItemList'
import CheckoutSummary from './CheckoutSummary'
import CouponInput from './CouponInput'
import { useCheckoutPrivacyConsent } from './hooks/useCheckoutPrivacyConsent'
import LiqPayPaymentHandoff from './LiqPayPaymentHandoff'
import PaymentMethodSelector from './PaymentMethodSelector'

export default function CheckoutClient({
  initialCartId,
}: {
  initialCartId?: string
}) {
  const {
    acceptedPrivacy,
    privacyConsentError,
    privacyConsentHintId,
    privacyConsentErrorId,
    privacyConsentRef,
    handlePrivacyConsentChange,
    requirePrivacyConsent,
    resetPrivacyConsent,
  } = useCheckoutPrivacyConsent()

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

  const handleSubmitCheckout = async () => {
    if (!requirePrivacyConsent()) {
      return
    }

    const result = await submitCheckout({ acceptedPrivacy: true })

    if (result) {
      resetPrivacyConsent()
    }
  }

  if (
    (isLoading && !preview) ||
    (!hasLoadedPreviewOnce && !loadError) ||
    (isSessionHydrating && (!preview || isEmpty))
  ) {
    return (
      <div
        className="grid gap-6 min-[1025px]:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]"
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
    <div className="grid gap-6 min-[1025px]:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
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

      <div className="space-y-6 min-[1025px]:sticky min-[1025px]:top-6 min-[1025px]:self-start">
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
        <CheckoutConfirmationCard
          acceptedPrivacy={acceptedPrivacy}
          privacyConsentRef={privacyConsentRef}
          privacyConsentHintId={privacyConsentHintId}
          privacyConsentErrorId={privacyConsentErrorId}
          privacyConsentError={privacyConsentError}
          previewSyncMessage={previewSyncMessage}
          isPreviewRecalculating={isPreviewRecalculating}
          submitError={submitError}
          canSubmit={canSubmit}
          isSubmitting={isSubmitting}
          selectedPaymentMethod={selectedPaymentMethod}
          onPrivacyConsentChange={handlePrivacyConsentChange}
          onSubmit={handleSubmitCheckout}
        />
      </div>
    </div>
  )
}
