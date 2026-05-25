'use client'

export default function ReorderControls({
  label,
  canMoveUp,
  canMoveDown,
  disabled = false,
  onMoveUp,
  onMoveDown,
}: {
  label: string
  canMoveUp: boolean
  canMoveDown: boolean
  disabled?: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <div className="flex items-center gap-2" aria-label={`${label} reorder controls`}>
      <button
        type="button"
        className="rounded-full border border-panelBorder px-3 py-2 text-sm text-copy-secondary transition-colors hover:bg-panelAlt hover:text-copy-strong disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onMoveUp}
        disabled={disabled || !canMoveUp}
        aria-label={`Move ${label} up`}
      >
        ↑
      </button>
      <button
        type="button"
        className="rounded-full border border-panelBorder px-3 py-2 text-sm text-copy-secondary transition-colors hover:bg-panelAlt hover:text-copy-strong disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onMoveDown}
        disabled={disabled || !canMoveDown}
        aria-label={`Move ${label} down`}
      >
        ↓
      </button>
    </div>
  )
}
