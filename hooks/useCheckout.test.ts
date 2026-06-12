import { describe, expect, it } from 'vitest'

import {
  buildAutoRefreshDeliveryPayload,
  buildAutoRefreshKey,
} from '@/hooks/useCheckout'

describe('useCheckout auto refresh helpers', () => {
  it('does not include recipient name or phone in the auto refresh payload for warehouse delivery', () => {
    const payload = buildAutoRefreshDeliveryPayload({
      deliveryMode: 'NOVA_POSHTA',
      selectedDeliveryType: 'NOVA_POSHTA_WAREHOUSE',
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
    })

    expect(payload).toEqual({
      deliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientCityRef: 'city-1',
      recipientCityName: 'Київ',
      recipientWarehouseRef: 'warehouse-1',
      recipientWarehouseName: 'Відділення 1',
    })
    expect(payload).not.toHaveProperty('recipientName')
    expect(payload).not.toHaveProperty('recipientPhone')
  })

  it('does not create an auto refresh payload when only recipient typing changed without a valid warehouse selection', () => {
    const payload = buildAutoRefreshDeliveryPayload({
      deliveryMode: 'NOVA_POSHTA',
      selectedDeliveryType: 'NOVA_POSHTA_WAREHOUSE',
      selectedCity: {
        ref: 'city-1',
        name: 'Київ',
        area: null,
        settlementType: null,
      },
      selectedWarehouse: null,
    })

    expect(payload).toBeUndefined()
  })

  it('builds one stable auto refresh key for the same warehouse selection', () => {
    const payload = buildAutoRefreshDeliveryPayload({
      deliveryMode: 'NOVA_POSHTA',
      selectedDeliveryType: 'NOVA_POSHTA_WAREHOUSE',
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
    })

    expect(buildAutoRefreshKey('cart-1', 'NOVA_POSHTA', payload)).toBe(
      'cart-1:NOVA_POSHTA:NOVA_POSHTA_WAREHOUSE:city-1:warehouse-1',
    )
    expect(buildAutoRefreshKey('cart-1', 'NOVA_POSHTA', payload)).toBe(
      'cart-1:NOVA_POSHTA:NOVA_POSHTA_WAREHOUSE:city-1:warehouse-1',
    )
  })

  it('does not create an auto refresh key for address mode or incomplete city selection', () => {
    expect(buildAutoRefreshKey('cart-1', 'ADDRESS')).toBeNull()

    const courierPayload = buildAutoRefreshDeliveryPayload({
      deliveryMode: 'NOVA_POSHTA',
      selectedDeliveryType: 'NOVA_POSHTA_COURIER',
      selectedCity: null,
      selectedWarehouse: null,
    })

    expect(courierPayload).toBeUndefined()
    expect(buildAutoRefreshKey('cart-1', 'NOVA_POSHTA', courierPayload)).toBeNull()
  })
})
