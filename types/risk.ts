export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

export const RISK_SIGNAL_TYPES = [
  'ABUSE_REPORT_CREATED',
  'DISPUTE_OPENED',
  'DISPUTE_LOST',
  'PAYMENT_FAILED',
  'REFUND_ISSUED',
  'PRODUCT_REJECTED',
  'SELLER_SUSPENDED',
  'REVIEW_HIDDEN',
  'ORDER_CANCELLED',
] as const

export type RiskLevel = (typeof RISK_LEVELS)[number]
export type RiskSignalType = (typeof RISK_SIGNAL_TYPES)[number]
export type RiskEntityType = 'USER' | 'STORE'

export type RiskSignal = {
  id: string
  userId: string | null
  storeId: string | null
  sourceType: string
  sourceId: string
  signalType: RiskSignalType
  weight: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

export type RiskUserPreview = {
  id: string
  email: string
  name: string | null
  displayName: string | null
  roles: string[]
}

export type RiskStorePreview = {
  id: string
  name: string
  slug: string
  owner: {
    id: string
    email: string
    name: string | null
    displayName: string | null
  }
}

export type RiskProfileListItem = {
  id: string
  userId: string | null
  storeId: string | null
  score: string
  level: RiskLevel
  lastCalculatedAt: string | null
  createdAt: string
  updatedAt: string
  user: RiskUserPreview | null
  store: RiskStorePreview | null
}

export type RiskProfileDetail = RiskProfileListItem & {
  signals: RiskSignal[]
}

export type RiskProfileListResponse = {
  items: RiskProfileListItem[]
  page: number
  limit: number
  total: number
}

export type RiskRecalculationResultItem = {
  targetType: RiskEntityType
  targetId: string
  profileId: string
  score: string
  level: RiskLevel
}

export type RiskRecalculationResult = {
  processed: number
  items: RiskRecalculationResultItem[]
}

export function getRiskLevelLabel(level: RiskLevel) {
  switch (level) {
    case 'LOW':
      return 'Низький'
    case 'MEDIUM':
      return 'Середній'
    case 'HIGH':
      return 'Високий'
    case 'CRITICAL':
      return 'Критичний'
  }
}

export function getRiskSignalLabel(signalType: RiskSignalType) {
  switch (signalType) {
    case 'ABUSE_REPORT_CREATED':
      return 'Створено скаргу'
    case 'DISPUTE_OPENED':
      return 'Відкрито спір'
    case 'DISPUTE_LOST':
      return 'Програно спір'
    case 'PAYMENT_FAILED':
      return 'Неуспішна оплата'
    case 'REFUND_ISSUED':
      return 'Оформлено повернення'
    case 'PRODUCT_REJECTED':
      return 'Товар відхилено'
    case 'SELLER_SUSPENDED':
      return 'Продавця призупинено'
    case 'REVIEW_HIDDEN':
      return 'Відгук приховано'
    case 'ORDER_CANCELLED':
      return 'Замовлення скасовано'
  }
}

export function formatRiskScore(score: string) {
  const numeric = Number(score)
  return Number.isFinite(numeric) ? numeric.toFixed(2) : score
}
