export type StoreDto = {
  id: string
  ownerId: string
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type StoreUpdateDto = Partial<Omit<StoreDto, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>
