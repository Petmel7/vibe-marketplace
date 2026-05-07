import { prisma } from '@/lib/prisma'
import type { AdminProfileDto } from './admin.dto'

export async function findAdminByUserId(userId: string): Promise<AdminProfileDto | null> {
  return prisma.adminProfile.findUnique({ where: { userId } })
}
