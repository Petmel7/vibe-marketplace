export class HeroBannerNotFoundError extends Error {
  code = 'HERO_BANNER_NOT_FOUND'

  constructor(message = 'Hero banner was not found') {
    super(message)
    this.name = 'HeroBannerNotFoundError'
  }
}

export class InvalidHeroBannerError extends Error {
  code = 'INVALID_HERO_BANNER'

  constructor(message = 'Hero banner is invalid') {
    super(message)
    this.name = 'InvalidHeroBannerError'
  }
}

export class InvalidHeroBannerDestinationError extends Error {
  code = 'INVALID_HERO_BANNER_DESTINATION'

  constructor(message = 'Hero banner destination is invalid') {
    super(message)
    this.name = 'InvalidHeroBannerDestinationError'
  }
}
