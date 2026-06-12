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
import type {
  CheckoutDeliveryMode,
  NovaPoshtaCity,
  NovaPoshtaWarehouse,
  ShippingDeliveryType,
} from '@/types/shipping'

type DeliveryPayload = {
  deliveryType?: ShippingDeliveryType | null
  recipientName?: string | null
  recipientPhone?: string | null
  recipientCityRef?: string | null
  recipientCityName?: string | null
  recipientStreet?: string | null
  recipientBuilding?: string | null
  recipientApartment?: string | null
  recipientWarehouseRef?: string | null
  recipientWarehouseName?: string | null
}

type AutoRefreshDeliveryInput = {
  deliveryMode: CheckoutDeliveryMode
  selectedDeliveryType: ShippingDeliveryType
  selectedCity: NovaPoshtaCity | null
  selectedWarehouse: NovaPoshtaWarehouse | null
}

function buildCheckoutPreviewUrl(
  cartId?: string,
  deliveryPayload?: DeliveryPayload,
) {
  const params = new URLSearchParams()

  if (cartId) {
    params.set('cartId', cartId)
  }

  if (deliveryPayload?.deliveryType) {
    params.set('deliveryType', deliveryPayload.deliveryType)
  }

  const pairs = [
    ['recipientName', deliveryPayload?.recipientName],
    ['recipientPhone', deliveryPayload?.recipientPhone],
    ['recipientCityRef', deliveryPayload?.recipientCityRef],
    ['recipientCityName', deliveryPayload?.recipientCityName],
    ['recipientStreet', deliveryPayload?.recipientStreet],
    ['recipientBuilding', deliveryPayload?.recipientBuilding],
    ['recipientApartment', deliveryPayload?.recipientApartment],
    ['recipientWarehouseRef', deliveryPayload?.recipientWarehouseRef],
    ['recipientWarehouseName', deliveryPayload?.recipientWarehouseName],
  ] as const

  for (const [key, value] of pairs) {
    if (value?.trim()) {
      params.set(key, value.trim())
    }
  }

  return params.size > 0 ? `${API_ROUTES.checkoutPreview}?${params.toString()}` : API_ROUTES.checkoutPreview
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

export function buildAutoRefreshDeliveryPayload(
  input: AutoRefreshDeliveryInput,
): DeliveryPayload | undefined {
  if (input.deliveryMode !== 'NOVA_POSHTA' || !input.selectedCity?.ref) {
    return undefined
  }

  if (input.selectedDeliveryType === 'NOVA_POSHTA_COURIER') {
    return {
      deliveryType: input.selectedDeliveryType,
      recipientCityRef: input.selectedCity.ref,
      recipientCityName: input.selectedCity.name,
    }
  }

  if (!input.selectedWarehouse?.ref) {
    return undefined
  }

  return {
    deliveryType: input.selectedDeliveryType,
    recipientCityRef: input.selectedCity.ref,
    recipientCityName: input.selectedCity.name,
    recipientWarehouseRef: input.selectedWarehouse.ref,
    recipientWarehouseName: input.selectedWarehouse.name,
  }
}

export function buildAutoRefreshKey(
  cartId: string | null | undefined,
  deliveryMode: CheckoutDeliveryMode,
  deliveryPayload?: DeliveryPayload,
) {
  if (!cartId) {
    return null
  }

  if (deliveryMode !== 'NOVA_POSHTA') {
    return null
  }

  if (!deliveryPayload?.deliveryType || !deliveryPayload.recipientCityRef) {
    return null
  }

  if (deliveryPayload.deliveryType === 'NOVA_POSHTA_COURIER') {
    return [
      cartId,
      deliveryMode,
      deliveryPayload.deliveryType,
      deliveryPayload.recipientCityRef,
    ].join(':')
  }

  if (!deliveryPayload.recipientWarehouseRef) {
    return null
  }

  return [
    cartId,
    deliveryMode,
    deliveryPayload.deliveryType,
    deliveryPayload.recipientCityRef,
    deliveryPayload.recipientWarehouseRef,
  ].join(':')
}

export function useCheckout(initialCartId?: string) {
  const router = useRouter()
  const setCartItemCount = useCartStore((state) => state.setItemCount)
  const [preview, setPreview] = useState<CheckoutPreview | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [deliveryMode, setDeliveryMode] = useState<CheckoutDeliveryMode>('ADDRESS')
  const [selectedDeliveryType, setSelectedDeliveryType] =
    useState<ShippingDeliveryType>('NOVA_POSHTA_WAREHOUSE')
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [selectedCity, setSelectedCity] = useState<NovaPoshtaCity | null>(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState<NovaPoshtaWarehouse | null>(null)
  const [recipientStreet, setRecipientStreet] = useState('')
  const [recipientBuilding, setRecipientBuilding] = useState('')
  const [recipientApartment, setRecipientApartment] = useState('')
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
  const [deliveryError, setDeliveryError] = useState<string | null>(null)
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponSuccessMessage, setCouponSuccessMessage] = useState<string | null>(null)
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null)
  const appliedCouponCodeRef = useRef<string | null>(null)
  const lastAutoRefreshKeyRef = useRef<string | null>(null)

  useEffect(() => {
    appliedCouponCodeRef.current = appliedCouponCode
  }, [appliedCouponCode])

  const getDeliveryPayload = useCallback((): DeliveryPayload | undefined => {
    if (deliveryMode !== 'NOVA_POSHTA') {
      return undefined
    }

    return {
      deliveryType: selectedDeliveryType,
      recipientName,
      recipientPhone,
      recipientCityRef: selectedCity?.ref ?? null,
      recipientCityName: selectedCity?.name ?? null,
      recipientStreet: selectedDeliveryType === 'NOVA_POSHTA_COURIER' ? recipientStreet : null,
      recipientBuilding: selectedDeliveryType === 'NOVA_POSHTA_COURIER' ? recipientBuilding : null,
      recipientApartment: selectedDeliveryType === 'NOVA_POSHTA_COURIER' ? recipientApartment : null,
      recipientWarehouseRef:
        selectedDeliveryType === 'NOVA_POSHTA_WAREHOUSE' ? selectedWarehouse?.ref ?? null : null,
      recipientWarehouseName:
        selectedDeliveryType === 'NOVA_POSHTA_WAREHOUSE' ? selectedWarehouse?.name ?? null : null,
    }
  }, [
    deliveryMode,
    recipientApartment,
    recipientBuilding,
    recipientName,
    recipientPhone,
    recipientStreet,
    selectedCity,
    selectedDeliveryType,
    selectedWarehouse,
  ])

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
    async (
      nextCartId?: string,
      preserveSelection = true,
      deliveryPayloadOverride?: DeliveryPayload,
    ) => {
      setIsLoading(true)
      setLoadError(null)

      try {
        const data = await apiClient.get<CheckoutPreview>(
          buildCheckoutPreviewUrl(nextCartId ?? initialCartId, deliveryPayloadOverride),
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

        const nextDeliverySelection = nextPreview.deliverySelection

        if (!preserveSelection) {
          setSelectedDeliveryType(
            nextDeliverySelection.selectedDeliveryType ?? 'NOVA_POSHTA_WAREHOUSE',
          )
          setRecipientName(nextDeliverySelection.recipientName ?? '')
          setRecipientPhone(nextDeliverySelection.recipientPhone ?? '')
          setRecipientStreet(nextDeliverySelection.recipientStreet ?? '')
          setRecipientBuilding(nextDeliverySelection.recipientBuilding ?? '')
          setRecipientApartment(nextDeliverySelection.recipientApartment ?? '')
          setSelectedCity(
            nextDeliverySelection.recipientCityRef && nextDeliverySelection.recipientCityName
              ? {
                  ref: nextDeliverySelection.recipientCityRef,
                  name: nextDeliverySelection.recipientCityName,
                  area: null,
                  settlementType: null,
                }
              : null,
          )
          setSelectedWarehouse(
            nextDeliverySelection.recipientWarehouseRef && nextDeliverySelection.recipientWarehouseName
              ? {
                  ref: nextDeliverySelection.recipientWarehouseRef,
                  name: nextDeliverySelection.recipientWarehouseName,
                  cityRef: nextDeliverySelection.recipientCityRef ?? '',
                  cityName: nextDeliverySelection.recipientCityName,
                }
              : null,
          )
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

        if (!preserveSelection) {
          const hasSavedAddress = Boolean(
            nextPreview.defaultShippingAddress?.id ?? nextPreview.addressOptions[0]?.id,
          )
          setDeliveryMode(hasSavedAddress ? 'ADDRESS' : 'NOVA_POSHTA')
          lastAutoRefreshKeyRef.current = null
        }
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

  const previewDeliveryPayload = useMemo(() => getDeliveryPayload(), [getDeliveryPayload])
  const autoRefreshDeliveryPayload = useMemo(
    () =>
      buildAutoRefreshDeliveryPayload({
        deliveryMode,
        selectedDeliveryType,
        selectedCity,
        selectedWarehouse,
      }),
    [deliveryMode, selectedCity, selectedDeliveryType, selectedWarehouse],
  )

  const hasCompleteNovaPoshtaSelection = useMemo(() => {
    if (deliveryMode !== 'NOVA_POSHTA') {
      return false
    }

    const hasBaseFields =
      Boolean(recipientName.trim()) &&
      Boolean(recipientPhone.trim()) &&
      Boolean(selectedCity?.ref)

    if (!hasBaseFields) {
      return false
    }

    if (selectedDeliveryType === 'NOVA_POSHTA_COURIER') {
      return Boolean(recipientStreet.trim()) && Boolean(recipientBuilding.trim())
    }

    return Boolean(selectedWarehouse?.ref)
  }, [
    deliveryMode,
    recipientBuilding,
    recipientName,
    recipientPhone,
    recipientStreet,
    selectedCity?.ref,
    selectedDeliveryType,
    selectedWarehouse?.ref,
  ])

  const autoRefreshKey = useMemo(
    () =>
      buildAutoRefreshKey(
        preview?.cartId,
        deliveryMode,
        autoRefreshDeliveryPayload,
      ),
    [autoRefreshDeliveryPayload, deliveryMode, preview?.cartId],
  )

  useEffect(() => {
    if (!preview?.cartId) {
      return
    }

    if (!autoRefreshKey || lastAutoRefreshKeyRef.current === autoRefreshKey) {
      return
    }

    const timer = window.setTimeout(() => {
      lastAutoRefreshKeyRef.current = autoRefreshKey
      void loadPreview(
        preview.cartId ?? undefined,
        true,
        deliveryMode === 'NOVA_POSHTA' ? autoRefreshDeliveryPayload : undefined,
      ).catch(() => {
        lastAutoRefreshKeyRef.current = null
      })
    }, 250)

    return () => window.clearTimeout(timer)
  }, [
    autoRefreshDeliveryPayload,
    autoRefreshKey,
    deliveryMode,
    loadPreview,
    preview?.cartId,
  ])

  const submitCheckout = useCallback(async ({ acceptedPrivacy }: { acceptedPrivacy: true }) => {
    if (!preview?.cartId || isSubmitting) {
      return null
    }

    if (!selectedPaymentMethod) {
      setPaymentMethodError('Оберіть спосіб оплати перед оформленням замовлення.')
      return null
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setPaymentMethodError(null)
    setAddressError(null)
    setDeliveryError(null)
    setPaymentHandoffAction(null)

    const usingAddress = deliveryMode === 'ADDRESS'

    if (usingAddress && !selectedAddressId) {
      setAddressError('Оберіть збережену адресу доставки або переключіться на Нову Пошту.')
      setIsSubmitting(false)
      return null
    }

    if (!usingAddress && !hasCompleteNovaPoshtaSelection) {
      setDeliveryError(
        selectedDeliveryType === 'NOVA_POSHTA_COURIER'
          ? 'Заповніть дані отримувача, місто та адресу кур’єрської доставки Нова Пошта.'
          : 'Заповніть дані отримувача, місто та відділення Нова Пошта.',
      )
      setIsSubmitting(false)
      return null
    }

    try {
      const deliveryPayload = getDeliveryPayload()
      const result = await apiClient.post<CheckoutResponse>(API_ROUTES.checkoutSubmit, {
        cartId: preview.cartId,
        shippingAddressId: usingAddress ? selectedAddressId : null,
        acceptedPrivacy,
        deliveryType: usingAddress ? null : deliveryPayload?.deliveryType ?? null,
        recipientName: usingAddress ? null : deliveryPayload?.recipientName?.trim() ?? null,
        recipientPhone: usingAddress ? null : deliveryPayload?.recipientPhone?.trim() ?? null,
        recipientCityRef: usingAddress ? null : deliveryPayload?.recipientCityRef ?? null,
        recipientCityName: usingAddress ? null : deliveryPayload?.recipientCityName ?? null,
        recipientStreet: usingAddress ? null : deliveryPayload?.recipientStreet ?? null,
        recipientBuilding: usingAddress ? null : deliveryPayload?.recipientBuilding ?? null,
        recipientApartment: usingAddress ? null : deliveryPayload?.recipientApartment ?? null,
        recipientWarehouseRef: usingAddress ? null : deliveryPayload?.recipientWarehouseRef ?? null,
        recipientWarehouseName: usingAddress ? null : deliveryPayload?.recipientWarehouseName ?? null,
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
        await loadPreview(preview.cartId, true, getDeliveryPayload())
      }

      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [
    deliveryMode,
    getDeliveryPayload,
    hasCompleteNovaPoshtaSelection,
    isSubmitting,
    loadPreview,
    preview,
    router,
    selectedAddressId,
    selectedDeliveryType,
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

        await loadPreview(preview?.cartId ?? undefined, false, getDeliveryPayload())
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
    [getDeliveryPayload, loadPreview, preview?.cartId],
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
    await loadPreview(preview?.cartId ?? undefined, true, getDeliveryPayload())
  }, [getDeliveryPayload, loadPreview, preview?.cartId])

  const hasBlockingIssues = (preview?.blockingIssues.length ?? 0) > 0
  const isEmpty = (preview?.items.length ?? 0) === 0
  const canSubmit =
    Boolean(preview?.cartId) &&
    !isEmpty &&
    !hasBlockingIssues &&
    (deliveryMode === 'ADDRESS' ? Boolean(selectedAddressId) : hasCompleteNovaPoshtaSelection) &&
    !isSubmitting

  return {
    preview,
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
    selectedAddress,
    isLoading,
    isSubmitting,
    isSavingAddress,
    isApplyingCoupon,
    paymentHandoffAction,
    loadError,
    submitError,
    addressError,
    deliveryError,
    paymentMethodError,
    couponCode,
    couponError,
    couponSuccessMessage,
    appliedCouponCode,
    isEmpty,
    canSubmit,
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
