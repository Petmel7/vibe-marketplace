import type { SellerVerificationStatus } from '@/app/generated/prisma/client'

export type SellerProfileDto = {
  id: string
  userId: string
  verificationStatus: SellerVerificationStatus
  businessName: string | null
  taxId: string | null
  createdAt: Date
  updatedAt: Date
}

export type SellerOnboardingDto = {
  businessName: string
  taxId?: string | null
}
