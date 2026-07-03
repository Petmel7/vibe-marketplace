import { describe, expect, it, vi } from 'vitest'

import {
  buildAutoRefreshDeliveryPayload,
  buildAutoRefreshKey,
  buildCheckoutPreviewUrl,
  buildPreviewDeliverySyncKey,
  buildSubmitDeliveryPayload,
  CHECKOUT_DELIVERY_DRAFT_STORAGE_KEY,
  clearCheckoutDeliveryDraft,
  getNovaPoshtaRecipientNameFieldError,
  getVisibleCheckoutBlockingIssues,
  loadCheckoutDeliveryDraft,
  saveCheckoutDeliveryDraft,
} from '@/hooks/useCheckout'

describe('useCheckout auto refresh helpers', () => {
  it('includes the recipient snapshot needed for server-side Nova Poshta estimate refresh', () => {
    const payload = buildAutoRefreshDeliveryPayload({
      deliveryMode: 'NOVA_POSHTA',
      selectedDeliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientFirstName: 'Іван',
      recipientLastName: 'Петренко',
      recipientMiddleName: '',
      recipientPhone: '+380000000000',
      selectedCity: {
        ref: 'city-1',
        name: 'Київ',
        area: null,
        settlementType: null,
      },
      selectedWarehouse: {
        ref: 'warehouse-1',
        name: 'Відділення 1',
        cityRef: 'city-1',
        cityName: 'Київ',
      },
      recipientStreet: '',
      recipientBuilding: '',
      recipientApartment: '',
    })

    expect(payload).toEqual({
      deliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientName: 'Петренко Іван',
      recipientFirstName: 'Іван',
      recipientLastName: 'Петренко',
      recipientMiddleName: null,
      recipientPhone: '+380000000000',
      recipientCityRef: 'city-1',
      recipientCityName: 'Київ',
      recipientWarehouseRef: 'warehouse-1',
      recipientWarehouseName: 'Відділення 1',
    })
  })

  it('creates an auto refresh payload after city selection even before warehouse selection is complete', () => {
    const payload = buildAutoRefreshDeliveryPayload({
      deliveryMode: 'NOVA_POSHTA',
      selectedDeliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientFirstName: 'Іван',
      recipientLastName: 'Петренко',
      recipientMiddleName: '',
      recipientPhone: '+380000000000',
      selectedCity: {
        ref: 'city-1',
        name: 'Київ',
        area: null,
        settlementType: null,
      },
      selectedWarehouse: null,
      recipientStreet: '',
      recipientBuilding: '',
      recipientApartment: '',
    })

    expect(payload).toEqual({
      deliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientName: 'Петренко Іван',
      recipientFirstName: 'Іван',
      recipientLastName: 'Петренко',
      recipientMiddleName: null,
      recipientPhone: '+380000000000',
      recipientCityRef: 'city-1',
      recipientCityName: 'Київ',
      recipientWarehouseRef: null,
      recipientWarehouseName: null,
    })
  })

  it('derives recipientName only from structured Nova Poshta recipient fields', () => {
    const payload = buildAutoRefreshDeliveryPayload({
      deliveryMode: 'NOVA_POSHTA',
      selectedDeliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientFirstName: 'Олег',
      recipientLastName: 'Меличин',
      recipientMiddleName: '',
      recipientPhone: '+380000000000',
      selectedCity: {
        ref: 'city-1',
        name: 'Київ',
        area: null,
        settlementType: null,
      },
      selectedWarehouse: {
        ref: 'warehouse-1',
        name: 'Відділення 1',
        cityRef: 'city-1',
        cityName: 'Київ',
      },
      recipientStreet: '',
      recipientBuilding: '',
      recipientApartment: '',
    })

    expect(payload?.recipientFirstName).toBe('Олег')
    expect(payload?.recipientLastName).toBe('Меличин')
    expect(payload?.recipientName).toBe('Меличин Олег')
  })

  it('rejects Latin letters in structured recipient fields before checkout preview request payload is built', () => {
    expect(getNovaPoshtaRecipientNameFieldError('Oлег', 'firstName')).toBeTruthy()

    const payload = buildAutoRefreshDeliveryPayload({
      deliveryMode: 'NOVA_POSHTA',
      selectedDeliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientFirstName: 'Oлег',
      recipientLastName: 'Меличин',
      recipientMiddleName: '',
      recipientPhone: '+380000000000',
      selectedCity: {
        ref: 'city-1',
        name: 'Київ',
        area: null,
        settlementType: null,
      },
      selectedWarehouse: {
        ref: 'warehouse-1',
        name: 'Відділення 1',
        cityRef: 'city-1',
        cityName: 'Київ',
      },
      recipientStreet: '',
      recipientBuilding: '',
      recipientApartment: '',
    })

    expect(payload).toBeUndefined()
  })

  it('builds one stable auto refresh key for the same warehouse selection', () => {
    const payload = buildAutoRefreshDeliveryPayload({
      deliveryMode: 'NOVA_POSHTA',
      selectedDeliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientFirstName: 'Іван',
      recipientLastName: 'Петренко',
      recipientMiddleName: '',
      recipientPhone: '+380000000000',
      selectedCity: {
        ref: 'city-1',
        name: 'Київ',
        area: null,
        settlementType: null,
      },
      selectedWarehouse: {
        ref: 'warehouse-1',
        name: 'Відділення 1',
        cityRef: 'city-1',
        cityName: 'Київ',
      },
      recipientStreet: '',
      recipientBuilding: '',
      recipientApartment: '',
    })

    const renamedRecipientPayload = buildAutoRefreshDeliveryPayload({
      deliveryMode: 'NOVA_POSHTA',
      selectedDeliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientFirstName: 'Р†РІР°РЅ',
      recipientLastName: 'РџРµС‚СЂРµРЅРєРѕ',
      recipientMiddleName: '',
      recipientPhone: '+380999999999',
      selectedCity: {
        ref: 'city-1',
        name: 'РљРёС—РІ',
        area: null,
        settlementType: null,
      },
      selectedWarehouse: {
        ref: 'warehouse-1',
        name: 'Р’С–РґРґС–Р»РµРЅРЅСЏ 1',
        cityRef: 'city-1',
        cityName: 'РљРёС—РІ',
      },
      recipientStreet: '',
      recipientBuilding: '',
      recipientApartment: '',
    })

    expect(buildAutoRefreshKey('cart-1', 'NOVA_POSHTA', payload)).toBe(
      'cart-1:NOVA_POSHTA:NOVA_POSHTA_WAREHOUSE:city-1:warehouse-1',
    )
    expect(
      buildAutoRefreshKey(
        'cart-1',
        'NOVA_POSHTA',
        payload
          ? {
              ...payload,
              recipientPhone: '+380999999999',
            }
          : undefined,
      ),
    ).toBe(
      'cart-1:NOVA_POSHTA:NOVA_POSHTA_WAREHOUSE:city-1:warehouse-1',
    )
  })

  it('marks incomplete Nova Poshta selections with a pending warehouse sync key so submit stays blocked until preview catches up', () => {
    const payload = buildAutoRefreshDeliveryPayload({
      deliveryMode: 'NOVA_POSHTA',
      selectedDeliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientFirstName: '',
      recipientLastName: '',
      recipientMiddleName: '',
      recipientPhone: '',
      selectedCity: {
        ref: 'city-1',
        name: 'Київ',
        area: null,
        settlementType: null,
      },
      selectedWarehouse: null,
      recipientStreet: '',
      recipientBuilding: '',
      recipientApartment: '',
    })

    expect(buildAutoRefreshKey('cart-1', 'NOVA_POSHTA', payload)).toBe(
      'cart-1:NOVA_POSHTA:NOVA_POSHTA_WAREHOUSE:city-1:warehouse-pending',
    )
  })

  it('does not create an auto refresh key for address mode or missing city selection', () => {
    expect(buildAutoRefreshKey('cart-1', 'ADDRESS')).toBeNull()

    const courierPayload = buildAutoRefreshDeliveryPayload({
      deliveryMode: 'NOVA_POSHTA',
      selectedDeliveryType: 'NOVA_POSHTA_COURIER',
      recipientFirstName: 'Іван',
      recipientLastName: 'Петренко',
      recipientMiddleName: '',
      recipientPhone: '+380000000000',
      selectedCity: null,
      selectedWarehouse: null,
      recipientStreet: 'Street',
      recipientBuilding: '1',
      recipientApartment: '',
    })

    expect(courierPayload).toBeUndefined()
    expect(buildAutoRefreshKey('cart-1', 'NOVA_POSHTA', courierPayload)).toBeNull()
  })

  it('derives the same sync key from preview delivery selection when the server is already up to date', () => {
    expect(
      buildPreviewDeliverySyncKey('cart-1', 'NOVA_POSHTA', {
        deliveryType: 'NOVA_POSHTA_WAREHOUSE',
        recipientName: 'Петренко Іван',
        recipientFirstName: 'Іван',
        recipientLastName: 'Петренко',
        recipientMiddleName: '',
        recipientPhone: '+380000000000',
        recipientCityRef: 'city-1',
        recipientStreet: null,
        recipientBuilding: null,
        recipientWarehouseRef: 'warehouse-1',
      }),
    ).toBe('cart-1:NOVA_POSHTA:NOVA_POSHTA_WAREHOUSE:city-1:warehouse-1')
  })

  it('includes coupon code, payment method, and Nova Poshta delivery fields in the checkout preview request', () => {
    const previewUrl = buildCheckoutPreviewUrl(
      'cart-1',
      {
        deliveryType: 'NOVA_POSHTA_WAREHOUSE',
        recipientName: 'Петренко Іван',
        recipientFirstName: 'Іван',
        recipientLastName: 'Петренко',
        recipientMiddleName: null,
        recipientPhone: '+380000000000',
        recipientCityRef: 'city-1',
        recipientCityName: 'Київ',
        recipientStreet: null,
        recipientBuilding: null,
        recipientApartment: null,
        recipientWarehouseRef: 'warehouse-1',
        recipientWarehouseName: 'Відділення 1',
      },
      {
        couponCode: 'STORE10',
        paymentMethod: 'CASH_ON_DELIVERY',
      },
    )

    expect(previewUrl).toContain('cartId=cart-1')
    expect(previewUrl).toContain('couponCode=STORE10')
    expect(previewUrl).toContain('paymentMethod=CASH_ON_DELIVERY')
    expect(previewUrl).toContain('deliveryType=NOVA_POSHTA_WAREHOUSE')
    expect(previewUrl).toContain('recipientCityRef=city-1')
    expect(previewUrl).toContain('recipientWarehouseRef=warehouse-1')
  })

  it('hides generic address blocking issues when Nova Poshta delivery is selected', () => {
    const issues = getVisibleCheckoutBlockingIssues(
      [
        {
          code: 'ADDRESS_REQUIRED',
          message: 'Select or add a shipping address before placing the order.',
        },
        { code: 'STOCK_UNAVAILABLE', message: 'Out of stock', variantId: 'variant-1' },
      ],
      'NOVA_POSHTA',
    )

    expect(issues).toEqual([
      { code: 'STOCK_UNAVAILABLE', message: 'Out of stock', variantId: 'variant-1' },
    ])
  })
})

describe('checkout delivery draft persistence', () => {
  it('saves and restores delivery draft values including city, warehouse, payment method, and coupon code', () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }

    saveCheckoutDeliveryDraft(storage, {
      deliveryMode: 'NOVA_POSHTA',
      selectedDeliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientFirstName: 'Іван',
      recipientLastName: 'Петренко',
      recipientMiddleName: 'Іванович',
      recipientPhone: '+380000000000',
      selectedCity: {
        ref: 'city-1',
        name: 'Київ',
        area: 'Київська',
        settlementType: 'м.',
      },
      selectedWarehouse: {
        ref: 'warehouse-1',
        name: 'Відділення 1',
        cityRef: 'city-1',
        cityName: 'Київ',
      },
      recipientStreet: '',
      recipientBuilding: '',
      recipientApartment: '',
      selectedPaymentMethod: 'CARD',
      couponCode: 'STORE10',
    })

    expect(storage.setItem).toHaveBeenCalledTimes(1)
    expect(storage.setItem).toHaveBeenCalledWith(
      CHECKOUT_DELIVERY_DRAFT_STORAGE_KEY,
      expect.stringContaining('"recipientFirstName":"Іван"'),
    )

    const persistedValue = (storage.setItem.mock.calls[0] ?? [])[1] as string
    storage.getItem.mockReturnValue(persistedValue)

    expect(loadCheckoutDeliveryDraft(storage)).toEqual({
      deliveryMode: 'NOVA_POSHTA',
      selectedDeliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientFirstName: 'Іван',
      recipientLastName: 'Петренко',
      recipientMiddleName: 'Іванович',
      recipientPhone: '+380000000000',
      selectedCity: {
        ref: 'city-1',
        name: 'Київ',
        area: 'Київська',
        settlementType: 'м.',
      },
      selectedWarehouse: {
        ref: 'warehouse-1',
        name: 'Відділення 1',
        cityRef: 'city-1',
        cityName: 'Київ',
      },
      recipientStreet: '',
      recipientBuilding: '',
      recipientApartment: '',
      selectedPaymentMethod: 'CARD',
      couponCode: 'STORE10',
    })
  })

  it('clears persisted draft after successful order placement', () => {
    const storage = {
      removeItem: vi.fn(),
    }

    clearCheckoutDeliveryDraft(storage)

    expect(storage.removeItem).toHaveBeenCalledWith(CHECKOUT_DELIVERY_DRAFT_STORAGE_KEY)
  })
})
