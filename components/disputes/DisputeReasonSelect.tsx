import { DISPUTE_REASONS, getDisputeReasonLabel, type DisputeReason } from '@/types/disputes'

export default function DisputeReasonSelect({
  id,
  value,
  onChange,
}: {
  id?: string
  value: DisputeReason
  onChange: (value: DisputeReason) => void
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value as DisputeReason)}
      className="w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
    >
      {DISPUTE_REASONS.map((reason) => (
        <option key={reason} value={reason}>
          {getDisputeReasonLabel(reason)}
        </option>
      ))}
    </select>
  )
}
