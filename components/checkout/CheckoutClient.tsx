'use client'

import EmptyState from '@/components/profile/EmptyState'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'
import DashboardCard from '@/components/profile/DashboardCard'
import type { CreateAddressDto } from '@/features/address/address.dto'
import { useCheckout } from '@/hooks/useCheckout'
import CheckoutAddressSelector from './CheckoutAddressSelector'
import CheckoutBlockingIssues from './CheckoutBlockingIssues'
import CheckoutItemList from './CheckoutItemList'
import PaymentMethodSelector from './PaymentMethodSelector'
import CheckoutSubmitButton from './CheckoutSubmitButton'
import CheckoutSummary from './CheckoutSummary'
import LiqPayPaymentHandoff from './LiqPayPaymentHandoff'

export default function CheckoutClient({
  initialCartId,
}: {
  initialCartId?: string
}) {
  const {
    preview,
    isLoading,
    isSubmitting,
    isSavingAddress,
    paymentHandoffAction,
    loadError,
    submitError,
    addressError,
    paymentMethodError,
    isEmpty,
    canSubmit,
    selectedAddressId,
    selectedPaymentMethod,
    setSelectedAddressId,
    setSelectedPaymentMethod,
    submitCheckout,
    addAddress,
  } = useCheckout(initialCartId)

  const handleAddAddress = async (payload: CreateAddressDto) => addAddress(payload)

  if (isLoading) {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
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
        <CheckoutBlockingIssues issues={preview.blockingIssues} />
        <CheckoutItemList items={preview.items} />
        <PaymentMethodSelector
          value={selectedPaymentMethod}
          onChange={setSelectedPaymentMethod}
          disabled={isSubmitting}
          errorMessage={paymentMethodError}
        />
        <CheckoutAddressSelector
          addresses={preview.addressOptions}
          selectedAddressId={selectedAddressId}
          onSelect={setSelectedAddressId}
          onAddAddress={handleAddAddress}
          isSaving={isSavingAddress}
          errorMessage={addressError}
        />
      </div>

      <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
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
              onSubmit={() => {
                void submitCheckout()
              }}
            />

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
