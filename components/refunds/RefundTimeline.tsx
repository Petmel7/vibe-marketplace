import RefundStatusBadge from './RefundStatusBadge'
import type {
  AdminRefundRequest,
  RefundRequestDetail,
  RefundRequestStatus,
  RefundRequestSummary,
  SellerRefundRequest,
} from '@/types/refunds'
import { getRefundActionLabel, getRefundRecordStatusLabel, getRefundStatusLabel } from '@/types/refunds'

type RefundTimelineRecord =
  | RefundRequestSummary
  | RefundRequestDetail
  | SellerRefundRequest
  | AdminRefundRequest

function hasActions(record: RefundTimelineRecord): record is RefundRequestDetail | AdminRefundRequest {
  return 'actions' in record
}

function getTimelineTone(status: RefundRequestStatus) {
  switch (status) {
    case 'SUCCEEDED':
    case 'APPROVED':
      return 'bg-brand-success'
    case 'FAILED':
    case 'REJECTED':
      return 'bg-brand-danger'
    case 'CANCELLED':
      return 'bg-panelBorder'
    default:
      return 'bg-brand-accent'
  }
}

export default function RefundTimeline({ refund }: { refund: RefundTimelineRecord }) {
  const items = [
    {
      id: 'created',
      title: 'Запит створено',
      description: new Date(refund.createdAt).toLocaleString('uk-UA'),
      tone: 'bg-brand-accent',
      badge: null,
    },
    {
      id: 'current-status',
      title: 'Поточний статус',
      description: getRefundStatusLabel(refund.status),
      tone: getTimelineTone(refund.status),
      badge: <RefundStatusBadge status={refund.status} />,
    },
    ...('refundRecord' in refund && refund.refundRecord
      ? [
          {
            id: 'refund-record',
            title: 'Refund record',
            description: `${getRefundRecordStatusLabel(refund.refundRecord.status)} · ${new Date(refund.refundRecord.updatedAt).toLocaleString('uk-UA')}`,
            tone: 'bg-brand-accent',
            badge: null,
          },
        ]
      : []),
    ...('resolvedAt' in refund && refund.resolvedAt
      ? [
          {
            id: 'resolved',
            title: 'Розгляд завершено',
            description: new Date(refund.resolvedAt).toLocaleString('uk-UA'),
            tone: getTimelineTone(refund.status),
            badge: null,
          },
        ]
      : []),
    ...(hasActions(refund)
      ? refund.actions.map((action) => ({
          id: action.id,
          title: getRefundActionLabel(action.actionType),
          description: `${action.actorName} · ${new Date(action.createdAt).toLocaleString('uk-UA')}${action.note ? ` · ${action.note}` : ''}`,
          tone: 'bg-panelBorder',
          badge: null,
        }))
      : []),
  ]

  return (
    <section className="ui-elevated-panel p-5 sm:p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-copy-strong">Хронологія</h2>
          <p className="mt-1 text-sm text-copy-muted">
            Тут зібрано статуси та службові кроки, які backend уже зафіксував для цього повернення.
          </p>
        </div>

        <ol className="space-y-4">
          {items.map((item, index) => (
            <li key={item.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className={`mt-1 h-3 w-3 rounded-full ${item.tone}`} aria-hidden="true" />
                {index < items.length - 1 ? <span className="mt-2 h-full w-px bg-panelBorder" aria-hidden="true" /> : null}
              </div>
              <div className="min-w-0 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-copy-strong">{item.title}</h3>
                  {item.badge}
                </div>
                <p className="mt-1 text-sm text-copy-secondary">{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
