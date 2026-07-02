import { describe, expect, it } from 'vitest'
import { getAdminAuditActorLabel } from './operations'

describe('operations audit actor formatting', () => {
  it('prefers actor email when available', () => {
    expect(
      getAdminAuditActorLabel({
        actorEmail: 'admin@example.com',
        actorRole: 'ADMIN',
        actorId: '350e0364-1234-5678-9abc-def012345678',
      }),
    ).toBe('admin@example.com')
  })

  it('falls back to role and short actor id when actor email is missing', () => {
    expect(
      getAdminAuditActorLabel({
        actorEmail: null,
        actorRole: 'ADMIN',
        actorId: '350e0364-1234-5678-9abc-def012345678',
      }),
    ).toBe('Admin · 350e0364')
  })
})
