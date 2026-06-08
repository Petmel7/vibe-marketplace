import { createAdminClient } from '@/lib/supabase/admin'
import { getServerEnv } from '@/config/env'
import {
  EvidenceUploadFailedError,
} from '@/lib/errors/abuse-report'
import { ABUSE_REPORT_EVIDENCE_BUCKET } from './abuse-report-evidence.dto'

function buildStoredObjectUrl(storagePath: string): string {
  const baseUrl = getServerEnv().SUPABASE_URL?.replace(/\/+$/, '') ?? ''
  return `${baseUrl}/storage/v1/object/authenticated/${ABUSE_REPORT_EVIDENCE_BUCKET}/${storagePath}`
}

export async function uploadAbuseReportEvidenceAsset(params: {
  storagePath: string
  body: Uint8Array
  contentType: string
}): Promise<{ url: string; storagePath: string }> {
  const client = createAdminClient()
  const { error } = await client.storage.from(ABUSE_REPORT_EVIDENCE_BUCKET).upload(
    params.storagePath,
    params.body,
    {
      cacheControl: '3600',
      contentType: params.contentType,
      upsert: false,
    },
  )

  if (error) {
    throw new EvidenceUploadFailedError('Unable to upload report evidence')
  }

  return {
    url: buildStoredObjectUrl(params.storagePath),
    storagePath: params.storagePath,
  }
}

export async function removeAbuseReportEvidenceAsset(storagePath: string): Promise<void> {
  const client = createAdminClient()
  const { error } = await client.storage.from(ABUSE_REPORT_EVIDENCE_BUCKET).remove([storagePath])

  if (error) {
    throw new EvidenceUploadFailedError('Unable to remove report evidence')
  }
}

export async function createSignedAbuseReportEvidenceUrl(storagePath: string): Promise<string> {
  const client = createAdminClient()
  const { data, error } = await client.storage
    .from(ABUSE_REPORT_EVIDENCE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60)

  if (error || !data?.signedUrl) {
    throw new EvidenceUploadFailedError('Unable to access report evidence')
  }

  return data.signedUrl
}
