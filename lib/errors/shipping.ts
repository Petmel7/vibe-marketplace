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

export class NovaPoshtaCreateShipmentError extends Error {
  code = 'NOVA_POSHTA_CREATE_SHIPMENT_ERROR'
  readonly statusCode: number
  readonly providerErrors: string[]
  readonly providerWarnings: string[]
  readonly providerInfo: string[]

  constructor(
    message = 'Nova Poshta shipment could not be created',
    options?: {
      statusCode?: number
      providerErrors?: string[]
      providerWarnings?: string[]
      providerInfo?: string[]
    },
  ) {
    super(message)
    this.name = 'NovaPoshtaCreateShipmentError'
    this.statusCode = options?.statusCode ?? 422
    this.providerErrors = options?.providerErrors ?? []
    this.providerWarnings = options?.providerWarnings ?? []
    this.providerInfo = options?.providerInfo ?? []
  }
}

export class NovaPoshtaTrackingError extends Error {
  code = 'NOVA_POSHTA_TRACKING_ERROR'

  constructor(message = 'Nova Poshta tracking data could not be loaded') {
    super(message)
    this.name = 'NovaPoshtaTrackingError'
  }
}

export class NovaPoshtaCancelShipmentError extends Error {
  code = 'NOVA_POSHTA_CANCEL_SHIPMENT_ERROR'

  constructor(message = 'Nova Poshta shipment could not be cancelled') {
    super(message)
    this.name = 'NovaPoshtaCancelShipmentError'
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

export class ShipmentNotFoundError extends Error {
  code = 'SHIPMENT_NOT_FOUND'

  constructor(message = 'Shipment could not be found') {
    super(message)
    this.name = 'ShipmentNotFoundError'
  }
}

export class ShipmentOwnershipError extends Error {
  code = 'SHIPMENT_OWNERSHIP_ERROR'

  constructor(message = 'You do not have access to this shipment') {
    super(message)
    this.name = 'ShipmentOwnershipError'
  }
}

export class ShipmentAlreadyHasTrackingError extends Error {
  code = 'SHIPMENT_ALREADY_HAS_TRACKING'

  constructor(message = 'Shipment already has a tracking number') {
    super(message)
    this.name = 'ShipmentAlreadyHasTrackingError'
  }
}

export class ShipmentInvalidStateError extends Error {
  code = 'SHIPMENT_INVALID_STATE'

  constructor(message = 'Shipment is not in a valid state for this action') {
    super(message)
    this.name = 'ShipmentInvalidStateError'
  }
}

export class StoreShippingSettingsRequiredError extends Error {
  code = 'STORE_SHIPPING_SETTINGS_REQUIRED'

  constructor(message = 'Configured store shipping settings are required for this action') {
    super(message)
    this.name = 'StoreShippingSettingsRequiredError'
  }
}

export class ShipmentSyncError extends Error {
  code = 'SHIPMENT_SYNC_ERROR'

  constructor(message = 'Shipment statuses could not be synchronized') {
    super(message)
    this.name = 'ShipmentSyncError'
  }
}

export class ShipmentReturnCreationError extends Error {
  code = 'SHIPMENT_RETURN_CREATION_ERROR'

  constructor(message = 'Return shipment could not be created') {
    super(message)
    this.name = 'ShipmentReturnCreationError'
  }
}

export class ShipmentAlreadyReturnedError extends Error {
  code = 'SHIPMENT_ALREADY_RETURNED'

  constructor(message = 'Return shipment already exists for this shipment') {
    super(message)
    this.name = 'ShipmentAlreadyReturnedError'
  }
}
