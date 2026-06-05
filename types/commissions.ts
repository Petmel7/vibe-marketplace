export const COMMISSION_RULE_SCOPES = ['GLOBAL', 'STORE', 'CATEGORY'] as const
export const COMMISSION_RULE_DISPLAY_STATUSES = ['ACTIVE', 'SCHEDULED', 'EXPIRED', 'DISABLED'] as const

export type CommissionRuleScope = (typeof COMMISSION_RULE_SCOPES)[number]
export type CommissionRuleDisplayStatus = (typeof COMMISSION_RULE_DISPLAY_STATUSES)[number]

export type CommissionRuleSummary = {
  id: string
  name: string
  scope: CommissionRuleScope
  storeId: string | null
  storeName: string | null
  categoryId: string | null
  categoryName: string | null
  rate: string
  startsAt: string
  endsAt: string | null
  priority: number
  isActive: boolean
  createdById: string
  createdByEmail: string | null
  createdAt: string
  updatedAt: string
}

export type CommissionRuleDetail = CommissionRuleSummary

export type CommissionRuleListResponse = {
  items: CommissionRuleSummary[]
  page: number
  limit: number
  total: number
}

export type CommissionRuleStoreOption = {
  id: string
  name: string
}

export type CommissionRuleCategoryOption = {
  id: string
  name: string
  parentId: string | null
  level: number
  isActive: boolean
}

export type CommissionRulePreview = {
  matchedRule: {
    id: string | null
    name: string | null
    scope: CommissionRuleScope | null
    storeId: string | null
    categoryId: string | null
    rate: string
  } | null
  grossAmount: string
  commissionAmount: string
  sellerNetAmount: string
}

export function getCommissionRuleScopeLabel(scope: CommissionRuleScope) {
  switch (scope) {
    case 'GLOBAL':
      return 'Global'
    case 'STORE':
      return 'Store'
    case 'CATEGORY':
      return 'Category'
  }
}

export function getCommissionRuleSpecificityLabel(rule: Pick<CommissionRuleSummary, 'scope' | 'storeName' | 'categoryName'>) {
  switch (rule.scope) {
    case 'GLOBAL':
      return 'Marketplace-wide default'
    case 'STORE':
      return rule.storeName ? `Store: ${rule.storeName}` : 'Store-specific'
    case 'CATEGORY':
      return rule.categoryName ? `Category: ${rule.categoryName}` : 'Category-specific'
  }
}

export function getCommissionRuleDisplayStatus(
  rule: Pick<CommissionRuleSummary, 'isActive' | 'startsAt' | 'endsAt'>,
  now = new Date(),
): CommissionRuleDisplayStatus {
  if (!rule.isActive) {
    return 'DISABLED'
  }

  const startsAt = new Date(rule.startsAt)
  if (startsAt > now) {
    return 'SCHEDULED'
  }

  if (rule.endsAt) {
    const endsAt = new Date(rule.endsAt)
    if (endsAt <= now) {
      return 'EXPIRED'
    }
  }

  return 'ACTIVE'
}

export function getCommissionRuleDisplayStatusLabel(status: CommissionRuleDisplayStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'Active'
    case 'SCHEDULED':
      return 'Scheduled'
    case 'EXPIRED':
      return 'Expired'
    case 'DISABLED':
      return 'Disabled'
  }
}

export function getCommissionRuleScopeHint(scope: CommissionRuleScope) {
  switch (scope) {
    case 'GLOBAL':
      return 'Applies when no more specific active rule wins.'
    case 'STORE':
      return 'Overrides category and global rules for one store.'
    case 'CATEGORY':
      return 'Overrides the global rule for one category.'
  }
}
