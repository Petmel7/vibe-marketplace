export class SeoMetadataNotFoundError extends Error {
  code = 'SEO_METADATA_NOT_FOUND'

  constructor(message = 'SEO metadata not found') {
    super(message)
    this.name = 'SeoMetadataNotFoundError'
  }
}

export class SeoEntityNotFoundError extends Error {
  code = 'SEO_ENTITY_NOT_FOUND'

  constructor(message = 'SEO entity not found') {
    super(message)
    this.name = 'SeoEntityNotFoundError'
  }
}

export class InvalidSeoMetadataError extends Error {
  code = 'INVALID_SEO_METADATA'

  constructor(message = 'SEO metadata is invalid') {
    super(message)
    this.name = 'InvalidSeoMetadataError'
  }
}

