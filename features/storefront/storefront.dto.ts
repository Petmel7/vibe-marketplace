import type { SellerVerificationStatus } from '@/app/generated/prisma/client'
import type { UploadedMediaAssetDto } from '@/features/media/media.dto'

export type StorefrontDto = {
  id: string
  userId: string
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
  isActive: boolean
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
}

export type OnboardingStatusDto = {
  isVerified: boolean
  hasStore: boolean
  isFullyProvisioned: boolean
  verificationStatus: SellerVerificationStatus
  store: StorefrontDto | null
}

export type SlugAvailabilityDto = {
  available: boolean
  suggestion: string | null
}

export type StorefrontAssetUploadDto = {
  asset: UploadedMediaAssetDto
  store: StorefrontDto
}
