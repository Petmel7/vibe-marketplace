export type UserProfileDto = {
  id: string
  userId: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  phoneNumber: string | null
  createdAt: Date
  updatedAt: Date
}

export type UpdateProfileDto = {
  displayName?: string | null
  avatarUrl?: string | null
  bio?: string | null
  phoneNumber?: string | null
}
