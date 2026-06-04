import { REFUND_REQUEST_REASONS, type RefundRequestReason } from '@/types/refunds'
import { getRefundReasonLabel } from '@/types/refunds'

export default function RefundReasonSelect({
  id,
  value,
  onChange,
  disabled = false,
}: {
  id: string
  value: RefundRequestReason
  onChange: (value: RefundRequestReason) => void
  disabled?: boolean
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as RefundRequestReason)}
      className="ui-surface-input"
    >
      {REFUND_REQUEST_REASONS.map((reason) => (
        <option key={reason} value={reason}>
          {getRefundReasonLabel(reason)}
        </option>
      ))}
    </select>
  )
}
