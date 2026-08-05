import DashboardMetricCard from '@/components/ui/dashboard/DashboardMetricCard'

export default function AdminMetricCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string | number
  detail: string
}) {
  return (
    <DashboardMetricCard
      label={label}
      value={value}
      detail={detail}
      labelClassName="text-xs uppercase tracking-[0.2em] text-copy-muted"
      valueClassName="mt-4 text-3xl font-semibold text-copy-strong"
      detailClassName="mt-3 text-sm text-copy-muted"
    />
  )
}
