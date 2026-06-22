// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const submitCheckoutMock = vi.fn()
const useCheckoutMock = vi.fn()

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode
    href: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/hooks/useCheckout', () => ({
  useCheckout: (...args: unknown[]) => useCheckoutMock(...args),
}))

vi.mock('@/components/profile/EmptyState', () => ({
  default: () => <div>empty-state</div>,
}))

vi.mock('@/components/auth/ProtectedRouteState', () => ({
  default: () => <div>protected-route-state</div>,
}))

vi.mock('@/components/profile/DashboardCard', () => ({
  default: ({
    children,
    title,
  }: {
    children: ReactNode
    title: string
  }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}))

vi.mock('@/components/checkout/CheckoutAddressSelector', () => ({
  default: () => <div>address-selector</div>,
}))

vi.mock('@/components/checkout/CheckoutBlockingIssues', () => ({
  default: () => <div>blocking-issues</div>,
}))

vi.mock('@/components/checkout/CheckoutDeliverySection', () => ({
  default: () => <div>delivery-section</div>,
}))

vi.mock('@/components/checkout/CheckoutItemList', () => ({
  default: () => <div>item-list</div>,
}))

vi.mock('@/components/checkout/PaymentMethodSelector', () => ({
  default: () => <div>payment-selector</div>,
}))

vi.mock('@/components/checkout/CheckoutSubmitButton', () => ({
  default: ({
    onSubmit,
  }: {
    onSubmit: () => void
  }) => (
    <button type="button" onClick={onSubmit}>
      submit-checkout
    </button>
  ),
}))

vi.mock('@/components/checkout/CheckoutSummary', () => ({
  default: () => <div>summary</div>,
}))

vi.mock('@/components/checkout/LiqPayPaymentHandoff', () => ({
  default: () => <div>liqpay-handoff</div>,
}))

vi.mock('@/components/checkout/CouponInput', () => ({
  default: () => <div>coupon-input</div>,
}))

vi.mock('@/components/checkout/AppliedCouponCard', () => ({
  default: () => <div>applied-coupon</div>,
}))

import CheckoutClient from '@/components/checkout/CheckoutClient'

function makeCheckoutState() {
  return {
    preview: {
      cartId: 'cart-1',
      items: [
        {
          id: 'item-1',
          productId: 'product-1',
          variantId: 'variant-1',
          storeId: 'store-1',
          storeName: 'Store',
          storeSlug: 'store',
          productName: 'Пальто',
          variantLabel: null,
          imageUrl: null,
          quantity: 1,
          unitPrice: '100.00',
          lineTotal: '100.00',
          availableStock: 10,
          inStock: true,
          stockStatus: 'IN_STOCK',
        },
      ],
      itemCount: 1,
      subtotal: '100.00',
      discountAmount: '0.00',
      shippingAmount: '0.00',
      total: '100.00',
      appliedPromotion: null,
      defaultShippingAddress: null,
      addressOptions: [],
      deliverySelection: {
        supportedDeliveryTypes: ['NOVA_POSHTA_WAREHOUSE'],
        selectedDeliveryType: null,
        recipientName: null,
        recipientPhone: null,
        recipientCityRef: null,
        recipientCityName: null,
        recipientStreet: null,
        recipientBuilding: null,
        recipientApartment: null,
        recipientWarehouseRef: null,
        recipientWarehouseName: null,
        estimatedCost: null,
        currency: 'UAH',
        isComplete: false,
      },
      blockingIssues: [],
      canCheckout: true,
    },
    isLoading: false,
    isSubmitting: false,
    isSavingAddress: false,
    isApplyingCoupon: false,
    paymentHandoffAction: null,
    loadError: null,
    hasLoadedPreviewOnce: true,
    submitError: null,
    addressError: null,
    deliveryError: null,
    paymentMethodError: null,
    couponCode: '',
    couponError: null,
    couponSuccessMessage: null,
    appliedCouponCode: null,
    blockingIssues: [],
    isEmpty: false,
    isSessionHydrating: false,
    isAuthCartSyncPending: false,
    canSubmit: true,
    selectedAddressId: '',
    deliveryMode: 'NOVA_POSHTA',
    selectedDeliveryType: 'NOVA_POSHTA_WAREHOUSE',
    recipientName: 'Іван',
    recipientPhone: '+380000000000',
    selectedCity: { ref: 'city-1', name: 'Київ' },
    selectedWarehouse: { ref: 'wh-1', name: 'Відділення 1', cityRef: 'city-1', cityName: 'Київ' },
    recipientStreet: '',
    recipientBuilding: '',
    recipientApartment: '',
    selectedPaymentMethod: 'CASH_ON_DELIVERY',
    setSelectedAddressId: vi.fn(),
    setDeliveryMode: vi.fn(),
    setSelectedDeliveryType: vi.fn(),
    setRecipientName: vi.fn(),
    setRecipientPhone: vi.fn(),
    setSelectedCity: vi.fn(),
    setSelectedWarehouse: vi.fn(),
    setRecipientStreet: vi.fn(),
    setRecipientBuilding: vi.fn(),
    setRecipientApartment: vi.fn(),
    setSelectedPaymentMethod: vi.fn(),
    setCouponCode: vi.fn(),
    submitCheckout: submitCheckoutMock,
    applyCoupon: vi.fn(),
    removeCoupon: vi.fn(),
    addAddress: vi.fn(),
  }
}

describe('CheckoutClient', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    vi.clearAllMocks()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    useCheckoutMock.mockReturnValue(makeCheckoutState())
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('blocks checkout when privacy consent is unchecked and focuses the checkbox', () => {
    act(() => {
      root.render(<CheckoutClient />)
    })

    const submitButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('submit-checkout'),
    )

    act(() => {
      submitButton?.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      )
    })

    const checkbox = container.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement | null

    expect(submitCheckoutMock).not.toHaveBeenCalled()
    expect(checkbox?.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(checkbox)
    expect(container.textContent).toContain('Підтвердьте згоду на обробку персональних даних.')
  })

  it('submits checkout when privacy consent is explicitly accepted and exposes the privacy link', () => {
    act(() => {
      root.render(<CheckoutClient />)
    })

    const checkbox = container.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement | null
    const privacyLink = container.querySelector('a[href="/privacy"]')
    const submitButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('submit-checkout'),
    )

    act(() => {
      checkbox?.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      )
    })

    act(() => {
      submitButton?.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      )
    })

    expect(privacyLink).not.toBeNull()
    expect(submitCheckoutMock).toHaveBeenCalledWith({
      acceptedPrivacy: true,
    })
  })

  it('shows cart sync state instead of a false empty cart during post-login merge refresh', () => {
    useCheckoutMock.mockReturnValue({
      ...makeCheckoutState(),
      preview: null,
      isEmpty: true,
      isAuthCartSyncPending: true,
    })

    act(() => {
      root.render(<CheckoutClient />)
    })

    expect(container.textContent).toContain('protected-route-state')
    expect(container.textContent).not.toContain('empty-state')
  })

  it('keeps checkout in loading state until the first preview load completes', () => {
    useCheckoutMock.mockReturnValue({
      ...makeCheckoutState(),
      preview: null,
      isEmpty: true,
      hasLoadedPreviewOnce: false,
      isSessionHydrating: true,
    })

    act(() => {
      root.render(<CheckoutClient />)
    })

    expect(
      container.querySelector('[data-testid="checkout-loading-state"]'),
    ).not.toBeNull()
    expect(container.textContent).not.toContain('empty-state')
  })
})
