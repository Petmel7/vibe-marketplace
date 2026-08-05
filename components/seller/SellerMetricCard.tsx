import type { ReactNode } from 'react'
import DashboardMetricCard from '@/components/ui/dashboard/DashboardMetricCard'

export default function SellerMetricCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string
  value: string | number
  detail?: ReactNode
  accent?: ReactNode
}) {
  return <DashboardMetricCard label={label} value={value} detail={detail} accent={accent} />
}
