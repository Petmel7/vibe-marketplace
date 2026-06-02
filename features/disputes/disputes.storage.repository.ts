import { createAdminClient } from '@/lib/supabase/admin'
import { DisputeEvidenceUploadError } from '@/lib/errors/dispute'
import { DISPUTE_EVIDENCE_BUCKET } from './disputes.dto'

function buildStoredObjectUrl(storagePath: string): string {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '') ?? ''
  return `${baseUrl}/storage/v1/object/authenticated/${DISPUTE_EVIDENCE_BUCKET}/${storagePath}`
}

export async function uploadDisputeEvidenceAsset(params: {
  storagePath: string
  body: Uint8Array
  contentType: string
}): Promise<{ url: string; storagePath: string }> {
  const client = createAdminClient()
  const { error } = await client.storage.from(DISPUTE_EVIDENCE_BUCKET).upload(
    params.storagePath,
    params.body,
    {
      cacheControl: '3600',
      contentType: params.contentType,
      upsert: false,
    },
  )

  if (error) {
    throw new DisputeEvidenceUploadError('Unable to upload dispute evidence')
  }

  return {
    url: buildStoredObjectUrl(params.storagePath),
    storagePath: params.storagePath,
  }
}

export async function createSignedDisputeEvidenceUrl(storagePath: string): Promise<string> {
  const client = createAdminClient()
  const { data, error } = await client.storage
    .from(DISPUTE_EVIDENCE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60)

  if (error || !data?.signedUrl) {
    throw new DisputeEvidenceUploadError('Unable to access dispute evidence')
  }

  return data.signedUrl
}

export async function removeDisputeEvidenceAsset(storagePath: string): Promise<void> {
  const client = createAdminClient()
  const { error } = await client.storage.from(DISPUTE_EVIDENCE_BUCKET).remove([storagePath])

  if (error) {
    throw new DisputeEvidenceUploadError('Unable to remove dispute evidence')
  }
}
