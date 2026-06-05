export class InvalidAnalyticsRangeError extends Error {
  code = 'INVALID_ANALYTICS_RANGE'

  constructor(message = 'Analytics date range is invalid') {
    super(message)
    this.name = 'InvalidAnalyticsRangeError'
  }
}

export class AnalyticsAccessDeniedError extends Error {
  code = 'ANALYTICS_ACCESS_DENIED'

  constructor(message = 'You do not have access to this analytics scope') {
    super(message)
    this.name = 'AnalyticsAccessDeniedError'
  }
}

export class AnalyticsAggregationError extends Error {
  code = 'ANALYTICS_AGGREGATION_ERROR'

  constructor(message = 'Failed to aggregate analytics data') {
    super(message)
    this.name = 'AnalyticsAggregationError'
  }
}
