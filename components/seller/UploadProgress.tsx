'use client'

export default function UploadProgress({
  label,
  current,
  total,
  isActive,
}: {
  label: string
  current: number
  total: number
  isActive: boolean
}) {
  if (!label || total <= 0) {
    return null
  }

  const percent = Math.max(0, Math.min(100, total === 0 ? 0 : Math.round((current / total) * 100)))

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex items-center justify-between gap-4 text-sm text-copy-secondary">
        <span>{label}</span>
        <span>
          {current}/{total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-panel">
        <div
          className={`h-full rounded-full transition-all ${isActive ? 'bg-brand' : 'bg-emerald-400'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
