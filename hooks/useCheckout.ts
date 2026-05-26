'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  CheckoutPreviewResponseDto,
  CheckoutResponseDto,
} from '@/features/checkout/checkout.dto'
import type { CreateAddressDto, ShippingAddressDto } from '@/features/address/address.dto'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import { apiClient } from '@/shared/api/api.client'
import { ApiError } from '@/shared/api/api.errors'
import { useCartStore } from '@/store/cartStore'

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
  const [preview, setPreview] = useState<CheckoutPreviewResponseDto | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)

  const loadPreview = useCallback(
    async (nextCartId?: string, preserveSelection = true) => {
      setIsLoading(true)
      setLoadError(null)

      try {
        const data = await apiClient.get<CheckoutPreviewResponseDto>(
          buildCheckoutPreviewUrl(nextCartId ?? initialCartId),
        )

        setPreview(data)
        setCartItemCount(data.itemCount)

        setSelectedAddressId((current) => {
          if (
            preserveSelection &&
            current &&
            data.addressOptions.some((address) => address.id === current)
          ) {
            return current
          }

          return data.defaultShippingAddress?.id ?? data.addressOptions[0]?.id ?? ''
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

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await apiClient.post<CheckoutResponseDto>(API_ROUTES.checkoutSubmit, {
        cartId: preview.cartId,
        shippingAddressId: selectedAddressId,
        expectedSubtotal: preview.subtotal,
        expectedTotal: preview.total,
      })

      setCartItemCount(0)
      router.replace(`/checkout/success/${result.orderId}`)
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
  }, [isSubmitting, loadPreview, preview, router, selectedAddressId, setCartItemCount])

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
    loadError,
    submitError,
    addressError,
    isEmpty,
    canSubmit,
    setSelectedAddressId,
    reloadPreview: loadPreview,
    submitCheckout,
    addAddress,
  }
}
