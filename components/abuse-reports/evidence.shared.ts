import type { AbuseReportEvidence } from '@/types/abuse-reports'

export const MAX_REPORT_EVIDENCE_FILES = 5
export const MAX_REPORT_EVIDENCE_SIZE_BYTES = 10 * 1024 * 1024
export const ACCEPTED_REPORT_EVIDENCE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const

export function isImageEvidenceType(fileType: string) {
  return fileType.startsWith('image/')
}

export function isPdfEvidenceType(fileType: string) {
  return fileType === 'application/pdf'
}

export function formatEvidenceSize(size: number) {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export function getEvidenceAcceptValue() {
  return '.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf'
}

export function getEvidenceValidationError(file: File) {
  if (!ACCEPTED_REPORT_EVIDENCE_TYPES.includes(file.type as (typeof ACCEPTED_REPORT_EVIDENCE_TYPES)[number])) {
    return `Файл ${file.name} має непідтримуваний формат. Доступні JPG, PNG, WEBP або PDF.`
  }

  if (file.size > MAX_REPORT_EVIDENCE_SIZE_BYTES) {
    return `Файл ${file.name} перевищує ліміт 10MB.`
  }

  return null
}

export function buildEvidenceCountLabel(items: AbuseReportEvidence[] | null, isLoading: boolean) {
  if (isLoading && !items) {
    return 'Завантажуємо докази...'
  }

  const count = items?.length ?? 0
  return `${count} ${count === 1 ? 'доказ' : count >= 2 && count <= 4 ? 'докази' : 'доказів'}`
}
