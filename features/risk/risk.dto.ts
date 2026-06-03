import type { RiskLevel, RiskSignalType, UserRole } from '@/app/generated/prisma/client'

export type RiskEntityType = 'USER' | 'STORE'

export type RiskSignalDto = {
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

export type RiskUserPreviewDto = {
  id: string
  email: string
  name: string | null
  displayName: string | null
  roles: UserRole[]
}

export type RiskStorePreviewDto = {
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

export type RiskProfileListItemDto = {
  id: string
  userId: string | null
  storeId: string | null
  score: string
  level: RiskLevel
  lastCalculatedAt: string | null
  createdAt: string
  updatedAt: string
  user: RiskUserPreviewDto | null
  store: RiskStorePreviewDto | null
}

export type RiskProfileDetailDto = RiskProfileListItemDto & {
  signals: RiskSignalDto[]
}

export type RiskProfileListDto = {
  items: RiskProfileListItemDto[]
  page: number
  limit: number
  total: number
}

export type RiskProfileQueryDto = {
  page: number
  limit: number
  level?: RiskLevel
  search?: string
}

export type RiskRecalculateRequestDto = {
  targetType: 'ALL' | RiskEntityType
  targetId?: string
}

export type RiskRecalculationResultItemDto = {
  targetType: RiskEntityType
  targetId: string
  profileId: string
  score: string
  level: RiskLevel
}

export type RiskRecalculationResultDto = {
  processed: number
  items: RiskRecalculationResultItemDto[]
}

export type RecordRiskSignalInput = {
  userId?: string | null
  storeId?: string | null
  sourceType: string
  sourceId: string
  signalType: RiskSignalType
  weight?: string | number
  metadata?: Record<string, unknown> | null
}
