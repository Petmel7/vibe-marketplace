import { prisma } from '@/lib/prisma'
import type { UserProfileDto, UpdateProfileDto } from './profile.dto'

export async function findProfileByUserId(userId: string): Promise<UserProfileDto | null> {
  return prisma.userProfile.findUnique({ where: { userId } })
}

export async function updateProfile(userId: string, data: UpdateProfileDto): Promise<UserProfileDto> {
  return prisma.userProfile.update({ where: { userId }, data })
}

export async function upsertProfile(userId: string, data: UpdateProfileDto): Promise<UserProfileDto> {
  return prisma.userProfile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  })
}
