import DisputeStatusBadge from './DisputeStatusBadge'
import type { DisputeDetail } from '@/types/disputes'

export default function DisputeTimeline({ dispute }: { dispute: DisputeDetail }) {
  const items = [
    {
      id: 'created',
      title: 'Суперечку відкрито',
      description: new Date(dispute.createdAt).toLocaleString('uk-UA'),
    },
    {
      id: 'status',
      title: 'Поточний статус',
      description: `${dispute.orderStatus} · ${dispute.paymentStatus ?? 'без статусу оплати'}`,
      badge: <DisputeStatusBadge status={dispute.status} />,
    },
    ...(dispute.resolvedAt
      ? [
          {
            id: 'resolved',
            title: 'Завершення розгляду',
            description: new Date(dispute.resolvedAt).toLocaleString('uk-UA'),
          },
        ]
      : []),
  ]

  return (
    <section className="ui-elevated-panel p-5 sm:p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-copy-strong">Хронологія</h2>
          <p className="mt-1 text-sm text-copy-muted">
            Відстежуйте, коли суперечку відкрили, як вона рухається та коли її завершили.
          </p>
        </div>

        <ol className="space-y-4">
          {items.map((item, index) => (
            <li key={item.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-3 w-3 rounded-full bg-brand-accent" aria-hidden="true" />
                {index < items.length - 1 ? <span className="mt-2 h-full w-px bg-panelBorder" aria-hidden="true" /> : null}
              </div>
              <div className="min-w-0 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-copy-strong">{item.title}</h3>
                  {item.badge ?? null}
                </div>
                <p className="mt-1 text-sm text-copy-secondary">{item.description}</p>
              </div>
            </li>
          ))}
        </ol>

        {dispute.resolutionNote ? (
          <div className="rounded-2xl border border-panelBorder bg-panelAlt px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-copy-muted">Примітка по рішенню</p>
            <p className="mt-2 text-sm text-copy-primary">{dispute.resolutionNote}</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
