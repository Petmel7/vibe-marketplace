import type { SellerVerificationStatus } from '@/app/generated/prisma/client'

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
