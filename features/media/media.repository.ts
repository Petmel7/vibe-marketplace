import { createAdminClient } from '@/lib/supabase/admin'
import { StoragePathConflictError, UploadFailedError } from '@/lib/errors/seller'
import type { MediaBucket } from './media.dto'

type UploadParams = {
  bucket: MediaBucket
  path: string
  body: Uint8Array
  contentType: string
}

export async function uploadPublicAsset(params: UploadParams): Promise<{ url: string; storagePath: string }> {
  const client = createAdminClient()
  const bucket = client.storage.from(params.bucket)
  const { error } = await bucket.upload(params.path, params.body, {
    cacheControl: '3600',
    contentType: params.contentType,
    upsert: false,
  })

  if (error) {
    if (error.message.toLowerCase().includes('duplicate') || error.message.toLowerCase().includes('exists')) {
      throw new StoragePathConflictError()
    }

    throw new UploadFailedError('Unable to upload image asset')
  }

  const { data } = bucket.getPublicUrl(params.path)

  return {
    url: data.publicUrl,
    storagePath: params.path,
  }
}

export async function removePublicAsset(bucketName: MediaBucket, storagePath: string): Promise<void> {
  const client = createAdminClient()
  const { error } = await client.storage.from(bucketName).remove([storagePath])

  if (error) {
    throw new UploadFailedError('Unable to remove image asset')
  }
}
