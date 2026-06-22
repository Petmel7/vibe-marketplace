'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CreateAddressDto, ShippingAddressDto } from '@/features/address/address.dto'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import { apiClient } from '@/shared/api/api.client'
import { ApiError } from '@/shared/api/api.errors'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useCartStore } from '@/store/cartStore'
import type {
  CheckoutBlockingIssue,
  CheckoutPreview,
  CheckoutResponse,
} from '@/types/checkout'
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
  recipientName: string
  recipientPhone: string
  selectedCity: NovaPoshtaCity | null
  selectedWarehouse: NovaPoshtaWarehouse | null
  recipientStreet: string
  recipientBuilding: string
  recipientApartment: string
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

  const recipientName = input.recipientName.trim() || null
  const recipientPhone = input.recipientPhone.trim() || null

  if (input.selectedDeliveryType === 'NOVA_POSHTA_COURIER') {
    return {
      deliveryType: input.selectedDeliveryType,
      recipientName,
      recipientPhone,
      recipientCityRef: input.selectedCity.ref,
      recipientCityName: input.selectedCity.name,
      recipientStreet: input.recipientStreet.trim() || null,
      recipientBuilding: input.recipientBuilding.trim() || null,
      recipientApartment: input.recipientApartment.trim() || null,
    }
  }

  return {
    deliveryType: input.selectedDeliveryType,
    recipientName,
    recipientPhone,
    recipientCityRef: input.selectedCity.ref,
    recipientCityName: input.selectedCity.name,
    recipientWarehouseRef: input.selectedWarehouse?.ref ?? null,
    recipientWarehouseName: input.selectedWarehouse?.name ?? null,
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

  const recipientState =
    deliveryPayload.recipientName?.trim() && deliveryPayload.recipientPhone?.trim()
      ? 'recipient-ready'
      : 'recipient-pending'

  if (deliveryPayload.deliveryType === 'NOVA_POSHTA_COURIER') {
    const addressState =
      deliveryPayload.recipientStreet?.trim() && deliveryPayload.recipientBuilding?.trim()
        ? 'address-ready'
        : 'address-pending'

    return [
      cartId,
      deliveryMode,
      deliveryPayload.deliveryType,
      deliveryPayload.recipientCityRef,
      recipientState,
      addressState,
    ].join(':')
  }

  return [
    cartId,
    deliveryMode,
    deliveryPayload.deliveryType,
    deliveryPayload.recipientCityRef,
    deliveryPayload.recipientWarehouseRef ?? 'warehouse-pending',
    recipientState,
  ].join(':')
}

export function buildPreviewDeliverySyncKey(
  cartId: string | null | undefined,
  deliveryMode: CheckoutDeliveryMode,
  deliverySelection?: Pick<
    DeliveryPayload,
    | 'deliveryType'
    | 'recipientName'
    | 'recipientPhone'
    | 'recipientCityRef'
    | 'recipientStreet'
    | 'recipientBuilding'
    | 'recipientWarehouseRef'
  > | null,
) {
  if (!deliverySelection) {
    return null
  }

  return buildAutoRefreshKey(cartId, deliveryMode, deliverySelection)
}

export function getVisibleCheckoutBlockingIssues(
  issues: CheckoutBlockingIssue[],
  deliveryMode: CheckoutDeliveryMode,
): CheckoutBlockingIssue[] {
  if (deliveryMode !== 'NOVA_POSHTA') {
    return issues
  }

  return issues.filter((issue) => issue.code !== 'ADDRESS_REQUIRED')
}

function getNovaPoshtaDeliveryError(input: {
  selectedDeliveryType: ShippingDeliveryType
  recipientName: string
  recipientPhone: string
  selectedCity: NovaPoshtaCity | null
  selectedWarehouse: NovaPoshtaWarehouse | null
  recipientStreet: string
  recipientBuilding: string
}): string {
  if (!input.recipientName.trim()) {
    return 'Вкажіть імʼя отримувача.'
  }

  if (!input.recipientPhone.trim()) {
    return 'Вкажіть номер телефону отримувача.'
  }

  if (!input.selectedCity?.ref) {
    return 'Оберіть місто Нової Пошти.'
  }

  if (input.selectedDeliveryType === 'NOVA_POSHTA_COURIER') {
    if (!input.recipientStreet.trim()) {
      return 'Вкажіть вулицю для курʼєрської доставки Нової Пошти.'
    }

    if (!input.recipientBuilding.trim()) {
      return 'Вкажіть номер будинку для курʼєрської доставки Нової Пошти.'
    }

    return 'Заповніть дані курʼєрської доставки Нової Пошти.'
  }

  if (!input.selectedWarehouse?.ref) {
    return 'Оберіть відділення або поштомат Нової Пошти.'
  }

  return 'Заповніть дані доставки Нової Пошти.'
}

export function useCheckout(initialCartId?: string) {
  const router = useRouter()
  const {
    hasCompletedInitialSync,
    isAuthenticated,
    isAuthLoading,
    isHydrated,
    isRefreshing,
    isSyncingUser,
  } = useCurrentUser()
  const setCartItemCount = useCartStore((state) => state.setItemCount)
  const cartRefreshKey = useCartStore((state) => state.refreshKey)
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
  const [isPreviewRecalculating, setIsPreviewRecalculating] = useState(false)
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [paymentHandoffAction, setPaymentHandoffAction] = useState<HostedPaymentAction | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [hasLoadedPreviewOnce, setHasLoadedPreviewOnce] = useState(false)
  const [isCartSyncPending, setIsCartSyncPending] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [previewSyncMessage, setPreviewSyncMessage] = useState<string | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [deliveryError, setDeliveryError] = useState<string | null>(null)
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponSuccessMessage, setCouponSuccessMessage] = useState<string | null>(null)
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null)
  const appliedCouponCodeRef = useRef<string | null>(null)
  const lastAutoRefreshKeyRef = useRef<string | null>(null)
  const lastHandledCartRefreshKeyRef = useRef<number | null>(null)
  const hasLoadedInitialPreviewRef = useRef(false)
  const deliveryPayloadRef = useRef<DeliveryPayload | undefined>(undefined)
  const previewCartIdRef = useRef<string | undefined>(initialCartId)

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
        setHasLoadedPreviewOnce(true)
        previewCartIdRef.current = nextPreview.cartId ?? nextCartId ?? initialCartId
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

  const isCheckoutPreviewBlocked =
    !hasCompletedInitialSync ||
    !isAuthenticated ||
    isSyncingUser ||
    !isHydrated ||
    isRefreshing

  useEffect(() => {
    if (isCheckoutPreviewBlocked) {
      setIsLoading(true)
      setLoadError(null)
      setIsCartSyncPending(false)
      return
    }

    hasLoadedInitialPreviewRef.current = false
    setHasLoadedPreviewOnce(false)
    lastHandledCartRefreshKeyRef.current = cartRefreshKey

    void loadPreview(initialCartId, false).finally(() => {
      hasLoadedInitialPreviewRef.current = true
    })
  }, [initialCartId, isCheckoutPreviewBlocked, loadPreview])

  useEffect(() => {
    if (isCheckoutPreviewBlocked) {
      setIsCartSyncPending(false)
      return
    }

    if (!hasLoadedInitialPreviewRef.current) {
      return
    }

    if (lastHandledCartRefreshKeyRef.current === cartRefreshKey) {
      return
    }

    let cancelled = false
    lastHandledCartRefreshKeyRef.current = cartRefreshKey
    setIsCartSyncPending(true)

    void loadPreview(
      previewCartIdRef.current ?? initialCartId,
      true,
      deliveryPayloadRef.current,
    ).finally(() => {
      if (!cancelled) {
        setIsCartSyncPending(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [
    cartRefreshKey,
    initialCartId,
    isCheckoutPreviewBlocked,
    loadPreview,
  ])

  const previewDeliveryPayload = useMemo(() => getDeliveryPayload(), [getDeliveryPayload])

  useEffect(() => {
    deliveryPayloadRef.current = previewDeliveryPayload
  }, [previewDeliveryPayload])

  const autoRefreshDeliveryPayload = useMemo(
    () =>
      buildAutoRefreshDeliveryPayload({
        deliveryMode,
        selectedDeliveryType,
        recipientName,
        recipientPhone,
        selectedCity,
        selectedWarehouse,
        recipientStreet,
        recipientBuilding,
        recipientApartment,
      }),
    [
      deliveryMode,
      recipientApartment,
      recipientBuilding,
      recipientName,
      recipientPhone,
      recipientStreet,
      selectedCity,
      selectedDeliveryType,
      selectedWarehouse,
    ],
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

  const previewSyncKey = useMemo(
    () =>
      buildPreviewDeliverySyncKey(preview?.cartId, deliveryMode, {
        deliveryType: preview?.deliverySelection.selectedDeliveryType ?? null,
        recipientName: preview?.deliverySelection.recipientName ?? null,
        recipientPhone: preview?.deliverySelection.recipientPhone ?? null,
        recipientCityRef: preview?.deliverySelection.recipientCityRef ?? null,
        recipientStreet: preview?.deliverySelection.recipientStreet ?? null,
        recipientBuilding: preview?.deliverySelection.recipientBuilding ?? null,
        recipientWarehouseRef: preview?.deliverySelection.recipientWarehouseRef ?? null,
      }),
    [
      deliveryMode,
      preview?.cartId,
      preview?.deliverySelection.recipientBuilding,
      preview?.deliverySelection.recipientCityRef,
      preview?.deliverySelection.recipientName,
      preview?.deliverySelection.recipientPhone,
      preview?.deliverySelection.recipientStreet,
      preview?.deliverySelection.recipientWarehouseRef,
      preview?.deliverySelection.selectedDeliveryType,
    ],
  )

  const isDeliveryPreviewStale =
    deliveryMode === 'NOVA_POSHTA' &&
    autoRefreshKey !== null &&
    autoRefreshKey !== previewSyncKey

  useEffect(() => {
    if (!preview?.cartId) {
      setIsPreviewRecalculating(false)
      return
    }

    if (!autoRefreshKey || lastAutoRefreshKeyRef.current === autoRefreshKey) {
      if (!autoRefreshKey) {
        setIsPreviewRecalculating(false)
      }
      return
    }

    setIsPreviewRecalculating(true)
    setPreviewSyncMessage(null)

    const timer = window.setTimeout(() => {
      lastAutoRefreshKeyRef.current = autoRefreshKey
      void loadPreview(
        preview.cartId ?? undefined,
        true,
        deliveryMode === 'NOVA_POSHTA' ? autoRefreshDeliveryPayload : undefined,
      )
        .catch(() => {
          lastAutoRefreshKeyRef.current = null
        })
        .finally(() => {
          setIsPreviewRecalculating(false)
        })
    }, 250)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    autoRefreshDeliveryPayload,
    autoRefreshKey,
    deliveryMode,
    loadPreview,
    preview?.cartId,
  ])

  const submitCheckout = useCallback(async ({ acceptedPrivacy }: { acceptedPrivacy: true }) => {
    if (!preview?.cartId || isSubmitting || isPreviewRecalculating || isDeliveryPreviewStale) {
      return null
    }

    if (!selectedPaymentMethod) {
      setPaymentMethodError('Оберіть спосіб оплати перед оформленням замовлення.')
      return null
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setPreviewSyncMessage(null)
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
        getNovaPoshtaDeliveryError({
          selectedDeliveryType,
          recipientName,
          recipientPhone,
          selectedCity,
          selectedWarehouse,
          recipientStreet,
          recipientBuilding,
        }),
      )
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
      const friendlyError = getFriendlyCheckoutError(
        error,
        'Unable to place this order right now.',
      )
      const isCheckoutPriceChanged =
        error instanceof ApiError && error.code === 'CHECKOUT_PRICE_CHANGED'

      if (shouldRefreshPreviewAfterError(error)) {
        await loadPreview(preview.cartId, true, getDeliveryPayload())
      }

      if (isCheckoutPriceChanged) {
        setSubmitError(null)
        setPreviewSyncMessage(
          'Checkout total was updated to match the latest shipping estimate. Please review the summary and submit again.',
        )
        return null
      }

      setSubmitError(friendlyError)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [
    deliveryMode,
    getDeliveryPayload,
    hasCompleteNovaPoshtaSelection,
    isDeliveryPreviewStale,
    isPreviewRecalculating,
    isSubmitting,
    loadPreview,
    preview,
    router,
    selectedAddressId,
    selectedCity,
    selectedDeliveryType,
    selectedPaymentMethod,
    selectedWarehouse,
    recipientBuilding,
    recipientName,
    recipientPhone,
    recipientStreet,
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

  const blockingIssues = useMemo(
    () => getVisibleCheckoutBlockingIssues(preview?.blockingIssues ?? [], deliveryMode),
    [deliveryMode, preview?.blockingIssues],
  )
  const hasBlockingIssues = blockingIssues.length > 0
  const isEmpty = (preview?.items.length ?? 0) === 0
  const isSessionHydrating =
    isAuthLoading || !hasCompletedInitialSync || !isHydrated || isRefreshing || isSyncingUser
  const isAuthCartSyncPending =
    isAuthenticated && (isSessionHydrating || isCartSyncPending)
  const isPreviewPending = isPreviewRecalculating || isDeliveryPreviewStale
  const canSubmit =
    Boolean(preview?.cartId) &&
    !isEmpty &&
    !hasBlockingIssues &&
    (deliveryMode === 'ADDRESS' ? Boolean(selectedAddressId) : hasCompleteNovaPoshtaSelection) &&
    !isPreviewPending &&
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
    isPreviewRecalculating: isPreviewPending,
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
