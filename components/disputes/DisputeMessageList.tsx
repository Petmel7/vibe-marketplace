import type { DisputeMessage } from '@/types/disputes'

export default function DisputeMessageList({
  messages,
  currentUserId,
  emptyMessage = 'Повідомлень у суперечці поки що немає.',
}: {
  messages: DisputeMessage[]
  currentUserId: string
  emptyMessage?: string
}) {
  if (messages.length === 0) {
    return (
      <div className="rounded-3xl border border-panelBorder bg-panelAlt px-4 py-4 text-sm text-copy-muted">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => {
        const isOwn = message.senderId === currentUserId
        return (
          <article
            key={message.id}
            className={`rounded-3xl border px-4 py-4 ${
              message.isInternal
                ? 'border-brand-danger/20 bg-brand-danger/5'
                : isOwn
                  ? 'border-brand-accent/20 bg-brand-accent/5'
                  : 'border-panelBorder bg-panelAlt'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-copy-strong">{message.senderName}</p>
                {message.isInternal ? (
                  <span className="rounded-full border border-brand-danger/20 bg-brand-danger/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-brand-danger">
                    Внутрішня нотатка
                  </span>
                ) : null}
              </div>
              <span className="text-xs text-copy-muted">
                {new Date(message.createdAt).toLocaleString('uk-UA')}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-copy-primary">{message.message}</p>
          </article>
        )
      })}
    </div>
  )
}
