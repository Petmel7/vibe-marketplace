import RefundAmount from './RefundAmount'
import RefundStatusBadge from './RefundStatusBadge'
import type {
  AdminRefundRequest,
  RefundRequestDetail,
  RefundRequestSummary,
  SellerRefundRequest,
} from '@/types/refunds'
import { getRefundReasonLabel, getRefundRecordStatusLabel } from '@/types/refunds'

type RefundCardRecord =
  | RefundRequestSummary
  | RefundRequestDetail
  | SellerRefundRequest
  | AdminRefundRequest

function hasRefundDetail(record: RefundCardRecord): record is RefundRequestDetail {
  return 'eligibleAmount' in record
}

function hasSellerContext(record: RefundCardRecord): record is SellerRefundRequest {
  return 'buyerName' in record
}

function hasAdminContext(record: RefundCardRecord): record is AdminRefundRequest {
  return 'requestedByName' in record
}

export default function RefundDetailCard({
  refund,
  title = 'Деталі повернення',
}: {
  refund: RefundCardRecord
  title?: string
}) {
  return (
    <section className="ui-elevated-panel p-5 sm:p-6">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-copy-strong">{title}</h2>
          <RefundStatusBadge status={refund.status} />
        </div>

        <dl className="grid gap-4 text-sm text-copy-secondary sm:grid-cols-2">
          <div>
            <dt className="text-copy-muted">Запит</dt>
            <dd className="mt-1 font-medium text-copy-strong">#{refund.id.slice(0, 8)}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Замовлення</dt>
            <dd className="mt-1 font-medium text-copy-strong">#{refund.orderId.slice(0, 8)}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Товар</dt>
            <dd className="mt-1 text-copy-primary">{refund.productName ?? 'Позиція замовлення'}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Магазин</dt>
            <dd className="mt-1 text-copy-primary">{refund.storeName ?? 'Marketplace'}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Причина</dt>
            <dd className="mt-1 text-copy-primary">{getRefundReasonLabel(refund.reason)}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Сума</dt>
            <dd className="mt-1">
              <RefundAmount amount={refund.amount} currency={refund.currency} emphasize />
            </dd>
          </div>
          <div>
            <dt className="text-copy-muted">Статус замовлення</dt>
            <dd className="mt-1 text-copy-primary">{refund.orderStatus}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Статус оплати</dt>
            <dd className="mt-1 text-copy-primary">{refund.paymentStatus ?? 'Немає даних'}</dd>
          </div>
          {hasSellerContext(refund) ? (
            <div>
              <dt className="text-copy-muted">Покупець</dt>
              <dd className="mt-1 text-copy-primary">{refund.buyerName}</dd>
            </div>
          ) : null}
          {hasAdminContext(refund) ? (
            <div>
              <dt className="text-copy-muted">Покупець</dt>
              <dd className="mt-1 text-copy-primary">{refund.requestedByName}</dd>
            </div>
          ) : null}
          {hasRefundDetail(refund) ? (
            <>
              <div>
                <dt className="text-copy-muted">Максимально доступно</dt>
                <dd className="mt-1 text-copy-primary">
                  <RefundAmount amount={refund.eligibleAmount} currency={refund.currency} />
                </dd>
              </div>
              <div>
                <dt className="text-copy-muted">Залишок до повернення</dt>
                <dd className="mt-1 text-copy-primary">
                  <RefundAmount amount={refund.remainingEligibleAmount} currency={refund.currency} />
                </dd>
              </div>
            </>
          ) : null}
          {hasRefundDetail(refund) && refund.refundRecord ? (
            <div>
              <dt className="text-copy-muted">Refund record</dt>
              <dd className="mt-1 text-copy-primary">
                {getRefundRecordStatusLabel(refund.refundRecord.status)} ·{' '}
                <RefundAmount amount={refund.refundRecord.amount} currency={refund.currency} />
              </dd>
            </div>
          ) : null}
          {'resolvedAt' in refund && refund.resolvedAt ? (
            <div>
              <dt className="text-copy-muted">Завершено</dt>
              <dd className="mt-1 text-copy-primary">
                {new Date(refund.resolvedAt).toLocaleString('uk-UA')}
              </dd>
            </div>
          ) : null}
        </dl>

        {refund.description ? (
          <div className="rounded-2xl border border-panelBorder bg-panelAlt px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-copy-muted">Опис</p>
            <p className="mt-2 text-sm leading-6 text-copy-primary">{refund.description}</p>
          </div>
        ) : null}

        {hasAdminContext(refund) && refund.adminNote ? (
          <div className="rounded-2xl border border-panelBorder bg-panelAlt px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-copy-muted">Адмін-нотатка</p>
            <p className="mt-2 text-sm leading-6 text-copy-primary">{refund.adminNote}</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
