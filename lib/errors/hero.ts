import { NotFoundError, ValidationError } from './app'

export class HeroBannerNotFoundError extends NotFoundError {
  constructor(message = 'Hero banner was not found') {
    super(message, 'HERO_BANNER_NOT_FOUND')
    this.name = 'HeroBannerNotFoundError'
  }
}

export class InvalidHeroBannerError extends ValidationError {
  constructor(message = 'Hero banner is invalid') {
    super(message, 'INVALID_HERO_BANNER')
    this.name = 'InvalidHeroBannerError'
  }
}

export class InvalidHeroBannerDestinationError extends ValidationError {
  constructor(message = 'Hero banner destination is invalid') {
    super(message, 'INVALID_HERO_BANNER_DESTINATION')
    this.name = 'InvalidHeroBannerDestinationError'
  }
}
