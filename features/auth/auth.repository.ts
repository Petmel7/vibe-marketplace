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
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          userId: true,
        },
      },
      buyer: {
        select: {
          userId: true,
        },
      },
      roles: {
        select: {
          role: true,
        },
      },
    },
  })

  const existingRoles = existingUser?.roles.map((assignment) => assignment.role) ?? []
  const hasBuyerRole = existingRoles.includes(UserRole.BUYER)
  const needsUserCreate = !existingUser
  const needsEmailUpdate = Boolean(existingUser && existingUser.email !== email)
  const needsProfileCreate = !existingUser?.profile
  const needsBuyerProfileCreate = !existingUser?.buyer
  const needsBuyerRoleCreate = !hasBuyerRole

  const hasMutations =
    needsUserCreate ||
    needsEmailUpdate ||
    needsProfileCreate ||
    needsBuyerProfileCreate ||
    needsBuyerRoleCreate

  if (hasMutations) {
    await prisma.$transaction(async (tx) => {
      const now = new Date()

      if (needsUserCreate) {
        await tx.user.create({
          data: {
            id,
            email,
            updatedAt: now,
          },
        })
      } else if (needsEmailUpdate) {
        await tx.user.update({
          where: { id },
          data: {
            email,
            updatedAt: now,
          },
        })
      }

      if (needsProfileCreate) {
        await tx.userProfile.create({
          data: {
            userId: id,
            updatedAt: now,
          },
        })
      }

      if (needsBuyerProfileCreate) {
        await tx.buyerProfile.create({
          data: {
            userId: id,
            updatedAt: now,
          },
        })
      }

      if (needsBuyerRoleCreate) {
        await tx.userRoleAssignment.create({
          data: {
            userId: id,
            role: UserRole.BUYER,
          },
        })
      }
    })
  }

  return {
    created: !existingUser,
    roles: hasBuyerRole ? existingRoles : [...existingRoles, UserRole.BUYER],
  }
}

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId },
    select: { role: true },
  })
  return assignments.map((a) => a.role)
}
