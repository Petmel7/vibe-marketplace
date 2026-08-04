type UploadValidationMessages = {
  invalidFile?: string
  emptyFile?: string
  maxBytes?: string
  unsupportedType?: string
}

type UploadValidationParams = {
  file: File
  maxBytes: number
  allowedContentTypes: ReadonlyMap<string, string>
  fallbackFilename?: string
  messages?: UploadValidationMessages
  createError: (message: string) => Error
}

export type ValidatedUploadFileMetadata = {
  contentType: string
  extension: string
  filename: string
  size: number
}

export function sanitizeUploadFilename(
  fileName: string,
  extension: string,
  fallbackFilename = 'upload',
): string {
  const baseName = fileName.replace(/\.[^.]+$/, '')
  const normalized = baseName
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 80)

  return `${normalized || fallbackFilename}.${extension}`
}

/**
 * Validates generic upload metadata before a feature-specific storage upload.
 * Use this for non-image or private uploads; public images still use media.service byte sniffing.
 */
export function validateUploadFileMetadata(params: UploadValidationParams): ValidatedUploadFileMetadata {
  if (!(params.file instanceof File)) {
    throw params.createError(params.messages?.invalidFile ?? 'A valid file upload is required')
  }

  if (params.file.size <= 0) {
    throw params.createError(params.messages?.emptyFile ?? 'File cannot be empty')
  }

  if (params.file.size > params.maxBytes) {
    throw params.createError(params.messages?.maxBytes ?? 'File exceeds the upload size limit')
  }

  const contentType = params.file.type.trim().toLowerCase()
  const extension = params.allowedContentTypes.get(contentType)

  if (!extension) {
    throw params.createError(params.messages?.unsupportedType ?? 'File type is not supported')
  }

  return {
    contentType,
    extension,
    filename: sanitizeUploadFilename(params.file.name, extension, params.fallbackFilename),
    size: params.file.size,
  }
}
