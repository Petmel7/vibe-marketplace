import { describe, expect, it } from 'vitest'

import {
  buildAutoRefreshDeliveryPayload,
  buildAutoRefreshKey,
  buildPreviewDeliverySyncKey,
  getVisibleCheckoutBlockingIssues,
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

    expect(buildAutoRefreshKey('cart-1', 'NOVA_POSHTA', payload)).toBe(
      'cart-1:NOVA_POSHTA:NOVA_POSHTA_WAREHOUSE:city-1:warehouse-1:recipient-ready',
    )
    expect(buildAutoRefreshKey('cart-1', 'NOVA_POSHTA', payload)).toBe(
      'cart-1:NOVA_POSHTA:NOVA_POSHTA_WAREHOUSE:city-1:warehouse-1:recipient-ready',
    )
  })

  it('marks incomplete Nova Poshta selections with a pending sync key so submit stays blocked until preview catches up', () => {
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
      'cart-1:NOVA_POSHTA:NOVA_POSHTA_WAREHOUSE:city-1:warehouse-pending:recipient-pending',
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
    ).toBe('cart-1:NOVA_POSHTA:NOVA_POSHTA_WAREHOUSE:city-1:warehouse-1:recipient-ready')
  })

  it('hides generic address blocking issues when Nova Poshta delivery is selected', () => {
    const issues = getVisibleCheckoutBlockingIssues(
      [
        { code: 'ADDRESS_REQUIRED', message: 'Select or add a shipping address before placing the order.' },
        { code: 'STOCK_UNAVAILABLE', message: 'Out of stock', variantId: 'variant-1' },
      ],
      'NOVA_POSHTA',
    )

    expect(issues).toEqual([
      { code: 'STOCK_UNAVAILABLE', message: 'Out of stock', variantId: 'variant-1' },
    ])
  })
})
