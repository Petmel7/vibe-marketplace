import clsx from 'clsx'

export default function UploadProgress({
  label = 'Завантажуємо…',
  value,
  className,
}: {
  label?: string
  value?: number
  className?: string
}) {
  return (
    <div className={clsx('rounded-2xl border border-panelBorder bg-panel/60 px-4 py-3 text-sm text-copy-secondary', className)} role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" aria-hidden="true" />
        <span>{label}</span>
      </div>
      {typeof value === 'number' ? (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-panelAlt">
          <div className="h-full rounded-full bg-brand-accent" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
        </div>
      ) : null}
    </div>
  )
}
