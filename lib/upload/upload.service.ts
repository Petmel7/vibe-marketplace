import { logError } from '@/utils/logger'
import type { UploadBucket } from './upload.config'

export type UploadResult<TBucket extends UploadBucket = UploadBucket> = {
  url: string
  storagePath: string
  bucket: TBucket
  contentType: string
  size: number
  filename: string
}

export type StoredUploadReference = {
  bucket?: UploadBucket | null
  storagePath?: string | null
  url?: string | null
}

export type UploadLifecycleContext = Record<string, unknown>

type UploadCleanupParams = {
  previous: StoredUploadReference | null | undefined
  deleteObject: (storagePath: string) => Promise<void>
  label: string
  context?: UploadLifecycleContext
  onCleanupFailed?: (error: unknown, previous: StoredUploadReference) => void | Promise<void>
}

type UploadAndPersistParams<TPersisted, TBucket extends UploadBucket = UploadBucket> = {
  upload: () => Promise<UploadResult<TBucket>>
  persist: (uploaded: UploadResult<TBucket>) => Promise<TPersisted>
  deleteUploadedObject: (storagePath: string) => Promise<void>
  cleanupUploadedLabel: string
  context?: UploadLifecycleContext
  onCleanupFailed?: (error: unknown, previous: StoredUploadReference) => void | Promise<void>
}

type ReplaceStoredUploadParams<TPersisted, TBucket extends UploadBucket = UploadBucket> =
  UploadAndPersistParams<TPersisted, TBucket> & {
  previous?: StoredUploadReference | null
  deletePreviousObject: (storagePath: string) => Promise<void>
  cleanupPreviousLabel: string
}

/**
 * Best-effort storage cleanup for objects whose authoritative DB state has already changed.
 * Missing legacy storage paths are skipped and cleanup failures are logged without failing callers.
 */
export async function cleanupStoredUpload(params: UploadCleanupParams): Promise<void> {
  const previous = params.previous
  if (!previous) {
    return
  }

  const storagePath = previous.storagePath?.trim()
  if (!storagePath) {
    return
  }

  try {
    await params.deleteObject(storagePath)
  } catch (error) {
    await params.onCleanupFailed?.(error, previous)
    logError(params.label, error, {
      ...params.context,
      bucket: previous.bucket ?? null,
      storagePath,
    })
  }
}

/**
 * Uploads an object and persists its metadata, deleting the new object if persistence fails.
 */
export async function uploadAndPersist<TPersisted, TBucket extends UploadBucket = UploadBucket>(
  params: UploadAndPersistParams<TPersisted, TBucket>,
): Promise<{ uploaded: UploadResult<TBucket>; persisted: TPersisted }> {
  const uploaded = await params.upload()

  try {
    const persisted = await params.persist(uploaded)
    return { uploaded, persisted }
  } catch (error) {
    await cleanupStoredUpload({
      previous: uploaded,
      deleteObject: params.deleteUploadedObject,
      label: params.cleanupUploadedLabel,
      context: params.context,
      onCleanupFailed: params.onCleanupFailed,
    })
    throw error
  }
}

/**
 * Standard replacement lifecycle: upload new object, persist new metadata, then clean up previous storage.
 */
export async function replaceStoredUpload<TPersisted, TBucket extends UploadBucket = UploadBucket>(
  params: ReplaceStoredUploadParams<TPersisted, TBucket>,
): Promise<{ uploaded: UploadResult<TBucket>; persisted: TPersisted }> {
  const result = await uploadAndPersist(params)

  await cleanupStoredUpload({
    previous: params.previous,
    deleteObject: params.deletePreviousObject,
    label: params.cleanupPreviousLabel,
    context: params.context,
    onCleanupFailed: params.onCleanupFailed,
  })

  return result
}
