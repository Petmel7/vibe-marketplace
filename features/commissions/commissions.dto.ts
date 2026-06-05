import type { CommissionRuleScope } from '@/app/generated/prisma/client'

export type CommissionRuleQueryDto = {
  page: number
  limit: number
  scope?: CommissionRuleScope
  isActive?: boolean
  storeId?: string
  categoryId?: string
}

export type CreateCommissionRuleInputDto = {
  name: string
  scope: CommissionRuleScope
  storeId?: string | null
  categoryId?: string | null
  rate: string
  startsAt: string
  endsAt?: string | null
  priority?: number
  isActive?: boolean
}

export type UpdateCommissionRuleInputDto = Partial<CreateCommissionRuleInputDto>

export type UpdateCommissionRuleStatusInputDto = {
  isActive: boolean
}

export type PreviewCommissionRuleInputDto = {
  storeId?: string | null
  categoryId?: string | null
  grossAmount: string
  at?: string | null
}

export type CommissionRuleSummaryDto = {
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

export type CommissionRuleDto = CommissionRuleSummaryDto

export type CommissionRuleListDto = {
  items: CommissionRuleSummaryDto[]
  page: number
  limit: number
  total: number
}

export type ResolvedCommissionRuleDto = {
  id: string | null
  name: string | null
  scope: CommissionRuleScope | null
  storeId: string | null
  categoryId: string | null
  rate: string
}

export type CommissionRulePreviewDto = {
  matchedRule: ResolvedCommissionRuleDto | null
  grossAmount: string
  commissionAmount: string
  sellerNetAmount: string
}

export type ResolvedCommissionCalculationDto = {
  ruleId: string | null
  ruleScope: CommissionRuleScope | null
  rate: string
  commissionAmount: string
  sellerNetAmount: string
}
