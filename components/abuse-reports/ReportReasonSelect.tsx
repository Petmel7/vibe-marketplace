'use client'

import type { AbuseReportReason } from '@/types/abuse-reports'

const REASON_OPTIONS: Array<{ value: AbuseReportReason; label: string }> = [
  { value: 'SPAM', label: 'Спам' },
  { value: 'SCAM', label: 'Шахрайство' },
  { value: 'COUNTERFEIT', label: 'Підробка' },
  { value: 'PROHIBITED_ITEM', label: 'Заборонений товар' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Неприйнятний контент' },
  { value: 'HARASSMENT', label: 'Домагання або образи' },
  { value: 'MISLEADING_INFO', label: 'Оманлива інформація' },
  { value: 'PAYMENT_ISSUE', label: 'Проблема з оплатою' },
  { value: 'DELIVERY_ISSUE', label: 'Проблема з доставкою' },
  { value: 'OTHER', label: 'Інше' },
]

export default function ReportReasonSelect({
  id,
  value,
  onChange,
}: {
  id: string
  value: AbuseReportReason
  onChange: (value: AbuseReportReason) => void
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value as AbuseReportReason)}
      className="ui-native-select w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
    >
      {REASON_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
