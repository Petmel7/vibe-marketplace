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

export async function ensureUserProvisioned(id: string, email: string) {
  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true },
  })

  await prisma.user.upsert({
    where: { id },
    update:
      existingUser?.email !== email
        ? {
            email,
            updatedAt: new Date(),
          }
        : {
            updatedAt: new Date(),
          },
    create: {
      id,
      email,
      updatedAt: new Date(),
    },
  })

  await prisma.userProfile.upsert({
    where: { userId: id },
    update: {
      updatedAt: new Date(),
    },
    create: {
      userId: id,
      updatedAt: new Date(),
    },
  })

  await prisma.buyerProfile.upsert({
    where: { userId: id },
    update: {
      updatedAt: new Date(),
    },
    create: {
      userId: id,
      updatedAt: new Date(),
    },
  })

  await prisma.userRoleAssignment.upsert({
    where: {
      userId_role: {
        userId: id,
        role: UserRole.BUYER,
      },
    },
    update: {},
    create: {
      userId: id,
      role: UserRole.BUYER,
    },
  })

  return { created: !existingUser }
}

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId },
    select: { role: true },
  })
  return assignments.map((a) => a.role)
}
