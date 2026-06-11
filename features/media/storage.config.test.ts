import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/config/env', () => ({
  getServerEnvDiagnostics: vi.fn(),
}))

import { getServerEnvDiagnostics } from '@/config/env'
import {
  getStorageBucketInventory,
  getStorageReadinessDiagnostics,
} from '@/features/media/storage.config'

describe('storage.config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the required bucket inventory with public and private access expectations', () => {
    const inventory = getStorageBucketInventory()

    expect(inventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bucket: 'product-images',
          visibility: 'public',
          usesSignedUrls: false,
        }),
        expect.objectContaining({
          bucket: 'store-assets',
          visibility: 'public',
          usesSignedUrls: false,
        }),
        expect.objectContaining({
          bucket: 'abuse-report-evidence',
          visibility: 'private',
          usesSignedUrls: true,
        }),
        expect.objectContaining({
          bucket: 'dispute-evidence',
          visibility: 'private',
          usesSignedUrls: true,
        }),
      ]),
    )
  })

  it('reports degraded readiness when server-side Supabase storage env is missing', () => {
    vi.mocked(getServerEnvDiagnostics).mockReturnValue({
      valid: false,
      required: {
        supabaseUrl: false,
        supabaseServiceRoleKey: false,
      },
    } as never)

    const diagnostics = getStorageReadinessDiagnostics()

    expect(diagnostics.ok).toBe(false)
    expect(diagnostics.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('SUPABASE_URL'),
        expect.stringContaining('SUPABASE_SERVICE_ROLE_KEY'),
        expect.stringContaining('abuse-report-evidence'),
        expect.stringContaining('dispute-evidence'),
      ]),
    )
  })
})
