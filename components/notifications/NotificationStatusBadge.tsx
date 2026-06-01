'use client'

export default function NotificationStatusBadge({
  readAt,
}: {
  readAt: string | null
}) {
  const isRead = Boolean(readAt)

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${
        isRead
          ? 'border-panelBorder bg-panel text-copy-muted'
          : 'border-brand/30 bg-brand/10 text-brand'
      }`}
    >
      {isRead ? 'Прочитано' : 'Нове'}
    </span>
  )
}

