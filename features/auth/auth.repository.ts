import { prisma } from '@/lib/prisma'
import { UserRole } from '@/app/generated/prisma/client'
import {
  resolveRepositoryClient,
  type RepositoryContext,
} from '@/lib/repository/context'

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } })
}

export async function createUserWithProfile(
  id: string,
  email: string,
  context?: RepositoryContext,
) {
  const db = resolveRepositoryClient(context)
  const now = new Date()

  const user = await db.user.create({
    data: {
      id,
      email,
      updatedAt: now,
    },
  })
  await db.userProfile.create({
    data: {
      userId: id,
      updatedAt: now,
    },
  })
  await db.buyerProfile.create({
    data: {
      userId: id,
      updatedAt: now,
    },
  })
  await db.userRoleAssignment.create({
    data: {
      userId: id,
      role: UserRole.BUYER,
    },
  })

  return user
}

export async function ensureUserProvisioned(
  id: string,
  email: string,
  context?: RepositoryContext,
) {
  const db = resolveRepositoryClient(context)
  const existingUser = await db.user.findUnique({
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
    const now = new Date()

    if (needsUserCreate) {
      await db.user.create({
        data: {
          id,
          email,
          updatedAt: now,
        },
      })
    } else if (needsEmailUpdate) {
      await db.user.update({
        where: { id },
        data: {
          email,
          updatedAt: now,
        },
      })
    }

    if (needsProfileCreate) {
      await db.userProfile.create({
        data: {
          userId: id,
          updatedAt: now,
        },
      })
    }

    if (needsBuyerProfileCreate) {
      await db.buyerProfile.create({
        data: {
          userId: id,
          updatedAt: now,
        },
      })
    }

    if (needsBuyerRoleCreate) {
      await db.userRoleAssignment.create({
        data: {
          userId: id,
          role: UserRole.BUYER,
        },
      })
    }
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
