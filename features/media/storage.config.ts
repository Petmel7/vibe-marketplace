import { getServerEnvDiagnostics } from '@/config/env'
import { ABUSE_REPORT_EVIDENCE_BUCKET } from '@/features/abuse-reports/abuse-report-evidence.dto'
import { DISPUTE_EVIDENCE_BUCKET } from '@/features/disputes/disputes.dto'
import { PRODUCT_IMAGE_BUCKET, STORE_ASSET_BUCKET } from './media.dto'

export type StorageBucketVisibility = 'public' | 'private'

export type StorageBucketConfigDto = {
  bucket: string
  visibility: StorageBucketVisibility
  uploadActors: string[]
  readActors: string[]
  usesSignedUrls: boolean
}

export type StorageReadinessDiagnosticsDto = {
  ok: boolean
  buckets: StorageBucketConfigDto[]
  issues: string[]
}

const STORAGE_BUCKETS: StorageBucketConfigDto[] = [
  {
    bucket: PRODUCT_IMAGE_BUCKET,
    visibility: 'public',
    uploadActors: ['server-admin-on-behalf-of-seller'],
    readActors: ['public'],
    usesSignedUrls: false,
  },
  {
    bucket: STORE_ASSET_BUCKET,
    visibility: 'public',
    uploadActors: ['server-admin-on-behalf-of-seller'],
    readActors: ['public'],
    usesSignedUrls: false,
  },
  {
    bucket: ABUSE_REPORT_EVIDENCE_BUCKET,
    visibility: 'private',
    uploadActors: ['server-admin-on-behalf-of-buyer', 'server-admin-on-behalf-of-admin'],
    readActors: ['reporter', 'admin'],
    usesSignedUrls: true,
  },
  {
    bucket: DISPUTE_EVIDENCE_BUCKET,
    visibility: 'private',
    uploadActors: [
      'server-admin-on-behalf-of-buyer',
      'server-admin-on-behalf-of-seller',
      'server-admin-on-behalf-of-admin',
    ],
    readActors: ['dispute-participant', 'admin'],
    usesSignedUrls: true,
  },
] as const

export function getStorageBucketInventory(): StorageBucketConfigDto[] {
  return STORAGE_BUCKETS.map((bucket) => ({
    ...bucket,
    uploadActors: [...bucket.uploadActors],
    readActors: [...bucket.readActors],
  }))
}

export function getStorageReadinessDiagnostics(): StorageReadinessDiagnosticsDto {
  const envDiagnostics = getServerEnvDiagnostics()
  const issues: string[] = []
  const required =
    envDiagnostics.valid
      ? envDiagnostics.required
      : {
          supabaseUrl: false,
          supabaseServiceRoleKey: false,
        }

  if (!required.supabaseUrl) {
    issues.push('SUPABASE_URL is required for storage object URL generation')
  }

  if (!required.supabaseServiceRoleKey) {
    issues.push('SUPABASE_SERVICE_ROLE_KEY is required for server-side storage operations')
  }

  issues.push(
    `Verify public bucket "${PRODUCT_IMAGE_BUCKET}" exists and is intentionally public`,
    `Verify public bucket "${STORE_ASSET_BUCKET}" exists and is intentionally public`,
    `Verify private bucket "${ABUSE_REPORT_EVIDENCE_BUCKET}" exists and is not publicly readable`,
    `Verify private bucket "${DISPUTE_EVIDENCE_BUCKET}" exists and is not publicly readable`,
  )

  return {
    ok: required.supabaseUrl && required.supabaseServiceRoleKey,
    buckets: getStorageBucketInventory(),
    issues,
  }
}
