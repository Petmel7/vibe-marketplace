import { describe, it, expect } from 'vitest'
import { UserRole } from '@/app/generated/prisma/client'
import { ForbiddenError } from '@/lib/errors/auth'
import { hasRole, requireRole } from '@/lib/rbac/guards'
import type { SessionUser } from '@/features/auth/auth.dto'

function makeUser(roles: UserRole[]): SessionUser {
  return { id: 'test-id', email: 'test@example.com', roles }
}

describe('hasRole', () => {
  it('returns true when user has the role', () => {
    const user = makeUser([UserRole.BUYER])
    expect(hasRole(user, UserRole.BUYER)).toBe(true)
  })

  it('returns false when user lacks the role', () => {
    const user = makeUser([UserRole.BUYER])
    expect(hasRole(user, UserRole.SELLER)).toBe(false)
  })

  it('returns false when user has no roles', () => {
    const user = makeUser([])
    expect(hasRole(user, UserRole.ADMIN)).toBe(false)
  })

  it('returns true when user has multiple roles including the target', () => {
    const user = makeUser([UserRole.BUYER, UserRole.SELLER])
    expect(hasRole(user, UserRole.SELLER)).toBe(true)
  })
})

describe('requireRole', () => {
  it('does not throw when user has the required role', () => {
    const user = makeUser([UserRole.ADMIN])
    expect(() => requireRole(user, UserRole.ADMIN)).not.toThrow()
  })

  it('throws ForbiddenError when user is missing the required role', () => {
    const user = makeUser([UserRole.BUYER])
    expect(() => requireRole(user, UserRole.SELLER)).toThrowError(ForbiddenError)
  })

  it('throws ForbiddenError with correct code', () => {
    const user = makeUser([UserRole.BUYER])
    try {
      requireRole(user, UserRole.ADMIN)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenError)
      expect((err as ForbiddenError).code).toBe('FORBIDDEN')
    }
  })

  it('throws ForbiddenError with descriptive message naming the required role', () => {
    const user = makeUser([])
    expect(() => requireRole(user, UserRole.SELLER)).toThrowError(
      'Role SELLER required'
    )
  })
})
