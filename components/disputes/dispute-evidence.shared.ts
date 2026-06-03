import type { DisputeEvidence } from '@/types/disputes'

export const MAX_DISPUTE_EVIDENCE_FILES = 5
export const MAX_DISPUTE_EVIDENCE_SIZE_BYTES = 10 * 1024 * 1024
export const ACCEPTED_DISPUTE_EVIDENCE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const

export function isDisputeImageEvidence(fileType: string) {
  return fileType.startsWith('image/')
}

export function isDisputePdfEvidence(fileType: string) {
  return fileType === 'application/pdf'
}

export function formatDisputeEvidenceSize(size: number) {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export function getDisputeEvidenceAcceptValue() {
  return '.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf'
}

export function getDisputeEvidenceValidationError(file: File) {
  if (!ACCEPTED_DISPUTE_EVIDENCE_TYPES.includes(file.type as (typeof ACCEPTED_DISPUTE_EVIDENCE_TYPES)[number])) {
    return `Файл ${file.name} має непідтримуваний формат. Доступні JPG, PNG, WEBP або PDF.`
  }

  if (file.size > MAX_DISPUTE_EVIDENCE_SIZE_BYTES) {
    return `Файл ${file.name} перевищує ліміт 10MB.`
  }

  return null
}

export function buildDisputeEvidenceCountLabel(items: DisputeEvidence[]) {
  const count = items.length
  return `${count} ${count === 1 ? 'доказ' : count >= 2 && count <= 4 ? 'докази' : 'доказів'}`
}
