export class NotificationNotFoundError extends Error {
  readonly code = 'NOTIFICATION_NOT_FOUND' as const

  constructor(message = 'Notification not found') {
    super(message)
    this.name = 'NotificationNotFoundError'
  }
}

export class NotificationOwnershipError extends Error {
  readonly code = 'FORBIDDEN' as const

  constructor(message = 'Access to this notification is not allowed') {
    super(message)
    this.name = 'NotificationOwnershipError'
  }
}
