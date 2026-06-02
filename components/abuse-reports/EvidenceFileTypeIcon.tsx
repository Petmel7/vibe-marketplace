import { isImageEvidenceType, isPdfEvidenceType } from './evidence.shared'

export default function EvidenceFileTypeIcon({
  fileType,
  className = '',
}: {
  fileType: string
  className?: string
}) {
  const label = isPdfEvidenceType(fileType) ? 'PDF' : isImageEvidenceType(fileType) ? 'IMG' : 'FILE'
  const toneClassName = isPdfEvidenceType(fileType)
    ? 'border-brand-accent/20 bg-brand-accent/10 text-brand-accent'
    : isImageEvidenceType(fileType)
      ? 'border-brand-success/20 bg-brand-success/10 text-brand-success'
      : 'border-panelBorder bg-panelAlt text-copy-muted'

  return (
    <div
      aria-hidden="true"
      className={`flex h-16 w-16 items-center justify-center rounded-2xl border text-xs font-semibold uppercase tracking-[0.24em] ${toneClassName} ${className}`}
    >
      {label}
    </div>
  )
}
