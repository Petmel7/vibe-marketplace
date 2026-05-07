export class ProfileNotFoundError extends Error {
  readonly code = 'PROFILE_NOT_FOUND'
  readonly statusCode = 404
  constructor(message = 'Profile not found') {
    super(message)
    this.name = 'ProfileNotFoundError'
  }
}

export class AddressNotFoundError extends Error {
  readonly code = 'ADDRESS_NOT_FOUND'
  readonly statusCode = 404
  constructor(message = 'Address not found') {
    super(message)
    this.name = 'AddressNotFoundError'
  }
}

export class AddressOwnershipError extends Error {
  readonly code = 'FORBIDDEN'
  readonly statusCode = 403
  constructor(message = 'You do not own this address') {
    super(message)
    this.name = 'AddressOwnershipError'
  }
}

export class SellerProfileNotFoundError extends Error {
  readonly code = 'SELLER_NOT_FOUND'
  readonly statusCode = 404
  constructor(message = 'Seller profile not found') {
    super(message)
    this.name = 'SellerProfileNotFoundError'
  }
}

export class SellerAlreadyOnboardedError extends Error {
  readonly code = 'ALREADY_ONBOARDED'
  readonly statusCode = 409
  constructor(message = 'Seller profile already exists') {
    super(message)
    this.name = 'SellerAlreadyOnboardedError'
  }
}

export class AdminProfileNotFoundError extends Error {
  readonly code = 'ADMIN_NOT_FOUND'
  readonly statusCode = 404
  constructor(message = 'Admin profile not found') {
    super(message)
    this.name = 'AdminProfileNotFoundError'
  }
}
