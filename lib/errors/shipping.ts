export class ShippingProviderError extends Error {
  code = 'SHIPPING_PROVIDER_ERROR'

  constructor(message = 'Shipping provider request failed') {
    super(message)
    this.name = 'ShippingProviderError'
  }
}

export class NovaPoshtaCityNotFoundError extends Error {
  code = 'NOVA_POSHTA_CITY_NOT_FOUND'

  constructor(message = 'Nova Poshta city could not be found') {
    super(message)
    this.name = 'NovaPoshtaCityNotFoundError'
  }
}

export class NovaPoshtaWarehouseNotFoundError extends Error {
  code = 'NOVA_POSHTA_WAREHOUSE_NOT_FOUND'

  constructor(message = 'Nova Poshta warehouse could not be found') {
    super(message)
    this.name = 'NovaPoshtaWarehouseNotFoundError'
  }
}

export class InvalidShippingSelectionError extends Error {
  code = 'INVALID_SHIPPING_SELECTION'

  constructor(message = 'Shipping selection is invalid') {
    super(message)
    this.name = 'InvalidShippingSelectionError'
  }
}

export class StoreShippingSettingsNotConfiguredError extends Error {
  code = 'STORE_SHIPPING_SETTINGS_NOT_CONFIGURED'

  constructor(message = 'Store shipping settings are not configured') {
    super(message)
    this.name = 'StoreShippingSettingsNotConfiguredError'
  }
}

export class ShipmentCreationError extends Error {
  code = 'SHIPMENT_CREATION_ERROR'

  constructor(message = 'Shipment snapshot could not be created') {
    super(message)
    this.name = 'ShipmentCreationError'
  }
}
