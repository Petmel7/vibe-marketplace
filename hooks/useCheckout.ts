'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CreateAddressDto, ShippingAddressDto } from '@/features/address/address.dto'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import { apiClient } from '@/shared/api/api.client'
import { ApiError } from '@/shared/api/api.errors'
import { useCartStore } from '@/store/cartStore'
import type { CheckoutPreview, CheckoutResponse } from '@/types/checkout'
import type { CheckoutPaymentMethod, HostedPaymentAction } from '@/types/payments'
import type { CheckoutPromotionPreview } from '@/types/promotions'

function buildCheckoutPreviewUrl(cartId?: string) {
  if (!cartId) {
    return API_ROUTES.checkoutPreview
  }

  const params = new URLSearchParams({ cartId })
  return `${API_ROUTES.checkoutPreview}?${params.toString()}`
}

function getFriendlyCheckoutError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

function getFriendlyCouponError(error: unknown) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'INVALID_PROMOTION_CODE':
        return 'That coupon code could not be found.'
      case 'PROMOTION_EXPIRED':
        return 'This coupon is no longer available.'
      case 'PROMOTION_INACTIVE':
        return 'This coupon is currently disabled.'
      case 'PROMOTION_MINIMUM_AMOUNT':
        return error.message || 'Your order does not meet the minimum amount for this coupon.'
      case 'PROMOTION_USAGE_LIMIT_REACHED':
        return 'This coupon has reached its total usage limit.'
      case 'PROMOTION_USER_LIMIT_REACHED':
        return 'You have already used this coupon the maximum number of times.'
      default:
        return error.message || 'Unable to apply this coupon right now.'
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unable to apply this coupon right now.'
}

function mergePromotionPreview(
  preview: CheckoutPreview,
  promotionPreview: CheckoutPromotionPreview,
): CheckoutPreview {
  return {
    ...preview,
    subtotal: promotionPreview.subtotal,
    discountAmount: promotionPreview.discountAmount,
    total: promotionPreview.total,
    appliedPromotion: promotionPreview.appliedPromotion,
  }
}

function shouldRefreshPreviewAfterError(error: unknown) {
  return (
    error instanceof ApiError &&
    ['CHECKOUT_STOCK_UNAVAILABLE', 'CHECKOUT_PRICE_CHANGED', 'CHECKOUT_PRODUCT_UNAVAILABLE'].includes(
      error.code ?? '',
    )
  )
}

export function useCheckout(initialCartId?: string) {
  const router = useRouter()
  const setCartItemCount = useCartStore((state) => state.setItemCount)
  const [preview, setPreview] = useState<CheckoutPreview | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<CheckoutPaymentMethod>('CASH_ON_DELIVERY')
  const [couponCode, setCouponCode] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [paymentHandoffAction, setPaymentHandoffAction] = useState<HostedPaymentAction | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponSuccessMessage, setCouponSuccessMessage] = useState<string | null>(null)
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null)
  const appliedCouponCodeRef = useRef<string | null>(null)

  useEffect(() => {
    appliedCouponCodeRef.current = appliedCouponCode
  }, [appliedCouponCode])

  const applyCouponToCart = useCallback(
    async (
      code: string,
      nextCartId?: string | null,
      options?: { silent?: boolean; basePreview?: CheckoutPreview | null },
    ) => {
      const normalizedCode = code.trim()
      const targetCartId = nextCartId ?? options?.basePreview?.cartId ?? preview?.cartId ?? initialCartId

      if (!normalizedCode || !targetCartId) {
        return null
      }

      const data = await apiClient.post<CheckoutPromotionPreview>(API_ROUTES.checkoutPromotionApply, {
        cartId: targetCartId,
        couponCode: normalizedCode,
      })

      const previewToMerge = options?.basePreview ?? preview
      if (previewToMerge) {
        setPreview(mergePromotionPreview(previewToMerge, data))
      }

      const coupon = data.appliedPromotion?.type === 'COUPON_CODE' ? data.appliedPromotion.code : null
      appliedCouponCodeRef.current = coupon
      setAppliedCouponCode(coupon)
      setCouponCode(coupon ?? '')

      if (!options?.silent) {
        setCouponError(null)
        setCouponSuccessMessage(
          coupon ? `Coupon ${coupon} is applied to this checkout.` : 'Discount refreshed from the server.',
        )
      }

      return data
    },
    [initialCartId, preview],
  )

  const loadPreview = useCallback(
    async (nextCartId?: string, preserveSelection = true) => {
      setIsLoading(true)
      setLoadError(null)

      try {
        const data = await apiClient.get<CheckoutPreview>(
          buildCheckoutPreviewUrl(nextCartId ?? initialCartId),
        )

        let nextPreview = data

        if (appliedCouponCodeRef.current && data.cartId) {
          try {
            const promotionPreview = await apiClient.post<CheckoutPromotionPreview>(
              API_ROUTES.checkoutPromotionApply,
              {
                cartId: data.cartId,
                couponCode: appliedCouponCodeRef.current,
              },
            )
            nextPreview = mergePromotionPreview(data, promotionPreview)
          } catch (error) {
            appliedCouponCodeRef.current = null
            setAppliedCouponCode(null)
            setCouponCode('')
            setCouponError(getFriendlyCouponError(error))
            setCouponSuccessMessage(null)
          }
        }

        setPreview(nextPreview)
        setCartItemCount(nextPreview.itemCount)
        if (nextPreview.appliedPromotion?.type === 'AUTOMATIC_DISCOUNT' && !appliedCouponCodeRef.current) {
          setCouponCode('')
        }

        setSelectedAddressId((current) => {
          if (
            preserveSelection &&
            current &&
            nextPreview.addressOptions.some((address) => address.id === current)
          ) {
            return current
          }

          return nextPreview.defaultShippingAddress?.id ?? nextPreview.addressOptions[0]?.id ?? ''
        })
      } catch (error) {
        setLoadError(
          getFriendlyCheckoutError(error, 'Unable to load checkout preview right now.'),
        )
      } finally {
        setIsLoading(false)
      }
    },
    [initialCartId, setCartItemCount],
  )

  useEffect(() => {
    void loadPreview(initialCartId, false)
  }, [initialCartId, loadPreview])

  const submitCheckout = useCallback(async () => {
    if (!preview?.cartId || !selectedAddressId || isSubmitting) {
      return null
    }

    if (!selectedPaymentMethod) {
      setPaymentMethodError('Оберіть спосіб оплати перед оформленням замовлення.')
      return null
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setPaymentMethodError(null)
    setPaymentHandoffAction(null)

    try {
      const result = await apiClient.post<CheckoutResponse>(API_ROUTES.checkoutSubmit, {
        cartId: preview.cartId,
        shippingAddressId: selectedAddressId,
        expectedSubtotal: preview.subtotal,
        expectedTotal: preview.total,
        couponCode: appliedCouponCodeRef.current,
        paymentMethod: selectedPaymentMethod,
      })

      setCartItemCount(0)

      if (result.paymentAction?.checkoutAction === 'POST_FORM') {
        setPaymentHandoffAction(result.paymentAction)
        return result
      }

      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl)
        return result
      }

      const params = new URLSearchParams({
        paymentMethod: result.paymentMethod,
        paymentStatus: result.paymentStatus,
        nextAction: result.nextAction,
      })

      if (result.paymentMethod === 'CARD') {
        router.replace(`/checkout/pending/${result.orderId}?${params.toString()}`)
        return result
      }

      router.replace(`/checkout/success/${result.orderId}?${params.toString()}`)
      return result
    } catch (error) {
      setSubmitError(
        getFriendlyCheckoutError(error, 'Unable to place this order right now.'),
      )

      if (shouldRefreshPreviewAfterError(error)) {
        await loadPreview(preview.cartId)
      }

      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [
    isSubmitting,
    loadPreview,
    preview,
    router,
    selectedAddressId,
    selectedPaymentMethod,
    setCartItemCount,
  ])

  const addAddress = useCallback(
    async (payload: CreateAddressDto) => {
      setIsSavingAddress(true)
      setAddressError(null)

      try {
        const address = await apiClient.post<ShippingAddressDto>(
          API_ROUTES.profileAddresses,
          payload,
        )

        await loadPreview(preview?.cartId ?? undefined, false)
        setSelectedAddressId(address.id)
        return address
      } catch (error) {
        setAddressError(
          getFriendlyCheckoutError(error, 'Unable to save the shipping address.'),
        )
        return null
      } finally {
        setIsSavingAddress(false)
      }
    },
    [loadPreview, preview?.cartId],
  )

  const selectedAddress = useMemo(
    () => preview?.addressOptions.find((address) => address.id === selectedAddressId) ?? null,
    [preview?.addressOptions, selectedAddressId],
  )

  const applyCoupon = useCallback(async () => {
    if (isApplyingCoupon || !preview?.cartId) {
      return null
    }

    setIsApplyingCoupon(true)
    setCouponError(null)
    setCouponSuccessMessage(null)

    try {
      return await applyCouponToCart(couponCode, preview.cartId)
    } catch (error) {
      setCouponError(getFriendlyCouponError(error))
      return null
    } finally {
      setIsApplyingCoupon(false)
    }
  }, [applyCouponToCart, couponCode, isApplyingCoupon, preview?.cartId])

  const removeCoupon = useCallback(async () => {
    appliedCouponCodeRef.current = null
    setAppliedCouponCode(null)
    setCouponCode('')
    setCouponError(null)
    setCouponSuccessMessage(null)
    await loadPreview(preview?.cartId ?? undefined)
  }, [loadPreview, preview?.cartId])

  const hasBlockingIssues = (preview?.blockingIssues.length ?? 0) > 0
  const isEmpty = (preview?.items.length ?? 0) === 0
  const canSubmit =
    Boolean(preview?.cartId) &&
    !isEmpty &&
    !hasBlockingIssues &&
    Boolean(selectedAddressId) &&
    !isSubmitting

  return {
    preview,
    selectedAddressId,
    selectedAddress,
    isLoading,
    isSubmitting,
    isSavingAddress,
    isApplyingCoupon,
    paymentHandoffAction,
    loadError,
    submitError,
    addressError,
    paymentMethodError,
    couponCode,
    couponError,
    couponSuccessMessage,
    appliedCouponCode,
    isEmpty,
    canSubmit,
    setSelectedAddressId,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    setCouponCode,
    setPaymentHandoffAction,
    reloadPreview: loadPreview,
    submitCheckout,
    applyCoupon,
    removeCoupon,
    addAddress,
  }
}
