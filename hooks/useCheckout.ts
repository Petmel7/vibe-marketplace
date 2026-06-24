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
  recipientFirstName?: string | null
  recipientLastName?: string | null
  recipientMiddleName?: string | null
  recipientPhone?: string | null
  recipientCityRef?: string | null
  recipientCityName?: string | null
  recipientStreet?: string | null
  recipientBuilding?: string | null
  recipientApartment?: string | null
  recipientWarehouseRef?: string | null
  recipientWarehouseName?: string | null
}

const NOVA_POSHTA_RECIPIENT_NAME_PATTERN = /^[\p{Script=Cyrillic}'’ʼ -]+$/u

type AutoRefreshDeliveryInput = {
  deliveryMode: CheckoutDeliveryMode
  selectedDeliveryType: ShippingDeliveryType
  recipientFirstName: string
  recipientLastName: string
  recipientMiddleName: string
  recipientPhone: string
  selectedCity: NovaPoshtaCity | null
  selectedWarehouse: NovaPoshtaWarehouse | null
  recipientStreet: string
  recipientBuilding: string
  recipientApartment: string
}

type PersistedCheckoutDeliveryDraft = {
  deliveryMode: CheckoutDeliveryMode
  selectedDeliveryType: ShippingDeliveryType
  recipientFirstName: string
  recipientLastName: string
  recipientMiddleName: string
  recipientPhone: string
  selectedCity: NovaPoshtaCity | null
  selectedWarehouse: NovaPoshtaWarehouse | null
  recipientStreet: string
  recipientBuilding: string
  recipientApartment: string
}

type PersistedCheckoutDeliveryDraftEnvelope = {
  version: 1
  draft: PersistedCheckoutDeliveryDraft
}

export const CHECKOUT_DELIVERY_DRAFT_STORAGE_KEY =
  'checkout:delivery-draft:v1'

function isCheckoutDeliveryMode(value: unknown): value is CheckoutDeliveryMode {
  return value === 'ADDRESS' || value === 'NOVA_POSHTA'
}

function isShippingDeliveryType(value: unknown): value is ShippingDeliveryType {
  return value === 'NOVA_POSHTA_WAREHOUSE' || value === 'NOVA_POSHTA_COURIER'
}

function normalizePersistedCity(value: unknown): NovaPoshtaCity | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Record<string, unknown>
  if (typeof candidate.ref !== 'string' || typeof candidate.name !== 'string') {
    return null
  }

  return {
    ref: candidate.ref,
    name: candidate.name,
    area: typeof candidate.area === 'string' ? candidate.area : null,
    settlementType:
      typeof candidate.settlementType === 'string' ? candidate.settlementType : null,
  }
}

function normalizePersistedWarehouse(value: unknown): NovaPoshtaWarehouse | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.ref !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.cityRef !== 'string'
  ) {
    return null
  }

  return {
    ref: candidate.ref,
    name: candidate.name,
    cityRef: candidate.cityRef,
    cityName: typeof candidate.cityName === 'string' ? candidate.cityName : null,
  }
}

export function loadCheckoutDeliveryDraft(
  storage: Pick<Storage, 'getItem'>,
): PersistedCheckoutDeliveryDraft | null {
  const raw = storage.getItem(CHECKOUT_DELIVERY_DRAFT_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedCheckoutDeliveryDraftEnvelope> | null
    if (!parsed || parsed.version !== 1 || !parsed.draft) {
      return null
    }

    const draft = parsed.draft as Partial<PersistedCheckoutDeliveryDraft>
    if (
      !isCheckoutDeliveryMode(draft.deliveryMode) ||
      !isShippingDeliveryType(draft.selectedDeliveryType)
    ) {
      return null
    }

    return {
      deliveryMode: draft.deliveryMode,
      selectedDeliveryType: draft.selectedDeliveryType,
      recipientFirstName:
        typeof draft.recipientFirstName === 'string' ? draft.recipientFirstName : '',
      recipientLastName:
        typeof draft.recipientLastName === 'string' ? draft.recipientLastName : '',
      recipientMiddleName:
        typeof draft.recipientMiddleName === 'string' ? draft.recipientMiddleName : '',
      recipientPhone: typeof draft.recipientPhone === 'string' ? draft.recipientPhone : '',
      selectedCity: normalizePersistedCity(draft.selectedCity),
      selectedWarehouse: normalizePersistedWarehouse(draft.selectedWarehouse),
      recipientStreet: typeof draft.recipientStreet === 'string' ? draft.recipientStreet : '',
      recipientBuilding:
        typeof draft.recipientBuilding === 'string' ? draft.recipientBuilding : '',
      recipientApartment:
        typeof draft.recipientApartment === 'string' ? draft.recipientApartment : '',
    }
  } catch {
    return null
  }
}

export function saveCheckoutDeliveryDraft(
  storage: Pick<Storage, 'setItem'>,
  draft: PersistedCheckoutDeliveryDraft,
) {
  const payload: PersistedCheckoutDeliveryDraftEnvelope = {
    version: 1,
    draft,
  }

  storage.setItem(CHECKOUT_DELIVERY_DRAFT_STORAGE_KEY, JSON.stringify(payload))
}

export function clearCheckoutDeliveryDraft(storage: Pick<Storage, 'removeItem'>) {
  storage.removeItem(CHECKOUT_DELIVERY_DRAFT_STORAGE_KEY)
}

function buildRecipientName(input: {
  recipientFirstName?: string | null
  recipientLastName?: string | null
  recipientMiddleName?: string | null
}) {
  return [
    input.recipientLastName?.trim() ?? '',
    input.recipientFirstName?.trim() ?? '',
    input.recipientMiddleName?.trim() ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function getNovaPoshtaRecipientNameFieldError(
  value: string,
  field: 'firstName' | 'lastName' | 'middleName',
) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return null
  }

  if (NOVA_POSHTA_RECIPIENT_NAME_PATTERN.test(trimmedValue)) {
    return null
  }

  switch (field) {
    case 'firstName':
      return 'Імʼя має містити лише українську кирилицю, апостроф, дефіс або пробіли.'
    case 'lastName':
      return 'Прізвище має містити лише українську кирилицю, апостроф, дефіс або пробіли.'
    case 'middleName':
      return 'По батькові має містити лише українську кирилицю, апостроф, дефіс або пробіли.'
  }
}

function buildPersistedDeliveryDraft(
  input: PersistedCheckoutDeliveryDraft,
): DeliveryPayload | undefined {
  return buildAutoRefreshDeliveryPayload(input)
}

export function buildSubmitDeliveryPayload(
  input: AutoRefreshDeliveryInput,
): DeliveryPayload | undefined {
  return buildAutoRefreshDeliveryPayload(input)
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
    ['recipientFirstName', deliveryPayload?.recipientFirstName],
    ['recipientLastName', deliveryPayload?.recipientLastName],
    ['recipientMiddleName', deliveryPayload?.recipientMiddleName],
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

  const recipientFirstName = input.recipientFirstName.trim() || null
  const recipientLastName = input.recipientLastName.trim() || null
  const recipientMiddleName = input.recipientMiddleName.trim() || null
  const recipientFirstNameError = getNovaPoshtaRecipientNameFieldError(
    recipientFirstName ?? '',
    'firstName',
  )
  const recipientLastNameError = getNovaPoshtaRecipientNameFieldError(
    recipientLastName ?? '',
    'lastName',
  )
  const recipientMiddleNameError = getNovaPoshtaRecipientNameFieldError(
    recipientMiddleName ?? '',
    'middleName',
  )

  if (recipientFirstNameError || recipientLastNameError || recipientMiddleNameError) {
    return undefined
  }

  const recipientName =
    buildRecipientName({
      recipientFirstName,
      recipientLastName,
      recipientMiddleName,
    }) || null
  const recipientPhone = input.recipientPhone.trim() || null

  if (input.selectedDeliveryType === 'NOVA_POSHTA_COURIER') {
    return {
      deliveryType: input.selectedDeliveryType,
      recipientName,
      recipientFirstName,
      recipientLastName,
      recipientMiddleName,
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
    recipientFirstName,
    recipientLastName,
    recipientMiddleName,
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
    deliveryPayload.recipientFirstName?.trim() &&
    deliveryPayload.recipientLastName?.trim() &&
    deliveryPayload.recipientPhone?.trim()
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
    | 'recipientFirstName'
    | 'recipientLastName'
    | 'recipientMiddleName'
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
  recipientFirstName: string
  recipientLastName: string
  recipientPhone: string
  selectedCity: NovaPoshtaCity | null
  selectedWarehouse: NovaPoshtaWarehouse | null
  recipientStreet: string
  recipientBuilding: string
}): string {
  if (!input.recipientFirstName.trim()) {
    return 'Вкажіть імʼя отримувача.'
  }

  if (!input.recipientLastName.trim()) {
    return 'Вкажіть прізвище отримувача.'
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
  const [recipientFirstName, setRecipientFirstName] = useState('')
  const [recipientLastName, setRecipientLastName] = useState('')
  const [recipientMiddleName, setRecipientMiddleName] = useState('')
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
  const [hasRestoredPersistedDraft, setHasRestoredPersistedDraft] = useState(false)
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
  const initialPersistedDraftRef = useRef<PersistedCheckoutDeliveryDraft | null>(null)
  const cartRefreshKeyRef = useRef(cartRefreshKey)

  useEffect(() => {
    appliedCouponCodeRef.current = appliedCouponCode
  }, [appliedCouponCode])

  useEffect(() => {
    cartRefreshKeyRef.current = cartRefreshKey
  }, [cartRefreshKey])

  useEffect(() => {
    if (typeof window === 'undefined') {
      setHasRestoredPersistedDraft(true)
      return
    }

    const draft = loadCheckoutDeliveryDraft(window.localStorage)
    initialPersistedDraftRef.current = draft

    if (draft) {
      setDeliveryMode(draft.deliveryMode)
      setSelectedDeliveryType(draft.selectedDeliveryType)
      setRecipientFirstName(draft.recipientFirstName)
      setRecipientLastName(draft.recipientLastName)
      setRecipientMiddleName(draft.recipientMiddleName)
      setRecipientPhone(draft.recipientPhone)
      setSelectedCity(draft.selectedCity)
      setSelectedWarehouse(draft.selectedWarehouse)
      setRecipientStreet(draft.recipientStreet)
      setRecipientBuilding(draft.recipientBuilding)
      setRecipientApartment(draft.recipientApartment)
      deliveryPayloadRef.current = buildPersistedDeliveryDraft(draft)
    }

    setHasRestoredPersistedDraft(true)
  }, [])

  const getDeliveryPayload = useCallback((): DeliveryPayload | undefined => {
    return buildSubmitDeliveryPayload({
      deliveryMode,
      selectedDeliveryType,
      recipientFirstName,
      recipientLastName,
      recipientMiddleName,
      recipientPhone,
      selectedCity,
      selectedWarehouse,
      recipientStreet,
      recipientBuilding,
      recipientApartment,
    })
  }, [
    deliveryMode,
    recipientApartment,
    recipientBuilding,
    recipientFirstName,
    recipientLastName,
    recipientMiddleName,
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
          setRecipientFirstName(nextDeliverySelection.recipientFirstName ?? '')
          setRecipientLastName(nextDeliverySelection.recipientLastName ?? '')
          setRecipientMiddleName(nextDeliverySelection.recipientMiddleName ?? '')
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
    if (!hasRestoredPersistedDraft) {
      return
    }

    if (isCheckoutPreviewBlocked) {
      setIsLoading(true)
      setLoadError(null)
      setIsCartSyncPending(false)
      return
    }

    hasLoadedInitialPreviewRef.current = false
    setHasLoadedPreviewOnce(false)

    const initialPersistedDraft = initialPersistedDraftRef.current
    const initialDeliveryPayload = initialPersistedDraft
      ? buildPersistedDeliveryDraft(initialPersistedDraft)
      : undefined

    void loadPreview(initialCartId, Boolean(initialPersistedDraft), initialDeliveryPayload).finally(() => {
      hasLoadedInitialPreviewRef.current = true
      lastHandledCartRefreshKeyRef.current = cartRefreshKeyRef.current
    })
  }, [hasRestoredPersistedDraft, initialCartId, isCheckoutPreviewBlocked, loadPreview])

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

  useEffect(() => {
    if (!hasRestoredPersistedDraft || typeof window === 'undefined') {
      return
    }

    saveCheckoutDeliveryDraft(window.localStorage, {
      deliveryMode,
      selectedDeliveryType,
      recipientFirstName,
      recipientLastName,
      recipientMiddleName,
      recipientPhone,
      selectedCity,
      selectedWarehouse,
      recipientStreet,
      recipientBuilding,
      recipientApartment,
    })
  }, [
    deliveryMode,
    hasRestoredPersistedDraft,
    recipientApartment,
    recipientBuilding,
    recipientFirstName,
    recipientLastName,
    recipientMiddleName,
    recipientPhone,
    recipientStreet,
    selectedCity,
    selectedDeliveryType,
    selectedWarehouse,
  ])

  const autoRefreshDeliveryPayload = useMemo(
    () =>
      buildAutoRefreshDeliveryPayload({
        deliveryMode,
        selectedDeliveryType,
        recipientFirstName,
        recipientLastName,
        recipientMiddleName,
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
      recipientFirstName,
      recipientLastName,
      recipientMiddleName,
      recipientPhone,
      recipientStreet,
      selectedCity,
      selectedDeliveryType,
      selectedWarehouse,
    ],
  )

  const recipientFirstNameError = useMemo(
    () => getNovaPoshtaRecipientNameFieldError(recipientFirstName, 'firstName'),
    [recipientFirstName],
  )
  const recipientLastNameError = useMemo(
    () => getNovaPoshtaRecipientNameFieldError(recipientLastName, 'lastName'),
    [recipientLastName],
  )
  const recipientMiddleNameError = useMemo(
    () => getNovaPoshtaRecipientNameFieldError(recipientMiddleName, 'middleName'),
    [recipientMiddleName],
  )

  const hasCompleteNovaPoshtaSelection = useMemo(() => {
    if (deliveryMode !== 'NOVA_POSHTA') {
      return false
    }

    if (recipientFirstNameError || recipientLastNameError || recipientMiddleNameError) {
      return false
    }

    const hasBaseFields =
      Boolean(recipientFirstName.trim()) &&
      Boolean(recipientLastName.trim()) &&
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
    recipientFirstName,
    recipientLastName,
    recipientFirstNameError,
    recipientLastNameError,
    recipientMiddleNameError,
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
        recipientFirstName: preview?.deliverySelection.recipientFirstName ?? null,
        recipientLastName: preview?.deliverySelection.recipientLastName ?? null,
        recipientMiddleName: preview?.deliverySelection.recipientMiddleName ?? null,
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
      preview?.deliverySelection.recipientFirstName,
      preview?.deliverySelection.recipientLastName,
      preview?.deliverySelection.recipientMiddleName,
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
          recipientFirstName,
          recipientLastName,
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
        recipientFirstName:
          usingAddress ? null : deliveryPayload?.recipientFirstName?.trim() ?? null,
        recipientLastName:
          usingAddress ? null : deliveryPayload?.recipientLastName?.trim() ?? null,
        recipientMiddleName:
          usingAddress ? null : deliveryPayload?.recipientMiddleName?.trim() ?? null,
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
      if (typeof window !== 'undefined') {
        clearCheckoutDeliveryDraft(window.localStorage)
      }

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
    recipientFirstName,
    recipientLastName,
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
    setRecipientFirstName,
    setRecipientLastName,
    setRecipientMiddleName,
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
