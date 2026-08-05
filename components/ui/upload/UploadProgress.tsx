import clsx from 'clsx'

export default function UploadProgress({
  label = 'Завантажуємо…',
  value,
  current,
  total,
  isActive = true,
  variant = 'card',
  className,
}: {
  label?: string
  value?: number
  current?: number
  total?: number
  isActive?: boolean
  variant?: 'card' | 'inline'
  className?: string
}) {
  if (!label || (typeof total === 'number' && total <= 0)) {
    return null
  }

  const resolvedValue =
    typeof value === 'number'
      ? value
      : typeof current === 'number' && typeof total === 'number' && total > 0
        ? Math.round((current / total) * 100)
        : undefined
  const percent = typeof resolvedValue === 'number' ? Math.min(100, Math.max(0, resolvedValue)) : undefined

  if (variant === 'inline') {
    return (
      <div className={clsx('space-y-2', className)} aria-live="polite">
        <div className="flex items-center justify-between gap-4 text-sm text-copy-secondary">
          <span>{label}</span>
          {typeof current === 'number' && typeof total === 'number' ? (
            <span>
              {current}/{total}
            </span>
          ) : null}
        </div>
        {typeof percent === 'number' ? (
          <div className="h-2 overflow-hidden rounded-full bg-panel">
            <div
              className={clsx('h-full rounded-full transition-all', isActive ? 'bg-brand' : 'bg-emerald-400')}
              style={{ width: `${percent}%` }}
            />
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={clsx('rounded-2xl border border-panelBorder bg-panel/60 px-4 py-3 text-sm text-copy-secondary', className)} role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" aria-hidden="true" />
        <span>{label}</span>
      </div>
      {typeof percent === 'number' ? (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-panelAlt">
          <div className="h-full rounded-full bg-brand-accent" style={{ width: `${percent}%` }} />
        </div>
      ) : null}
    </div>
  )
}
