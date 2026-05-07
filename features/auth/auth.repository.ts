import { prisma } from '@/lib/prisma'
import { UserRole } from '@/app/generated/prisma/client'

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } })
}

export async function createUserWithProfile(id: string, email: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id,
        email,
        updatedAt: new Date(),
      },
    })
    await tx.userProfile.create({
      data: {
        userId: id,
        updatedAt: new Date(),
      },
    })
    await tx.buyerProfile.create({
      data: {
        userId: id,
        updatedAt: new Date(),
      },
    })
    await tx.userRoleAssignment.create({
      data: {
        userId: id,
        role: UserRole.BUYER,
      },
    })
    return user
  })
}

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId },
    select: { role: true },
  })
  return assignments.map((a) => a.role)
}
