import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import { getRiskLevelLabel, type RiskLevel } from '@/types/risk'

function getRiskLevelTone(level: RiskLevel) {
  switch (level) {
    case 'LOW':
      return 'success' as const
    case 'MEDIUM':
      return 'warning' as const
    case 'HIGH':
      return 'danger' as const
    case 'CRITICAL':
      return 'danger' as const
  }
}

export default function RiskLevelBadge({ level }: { level: RiskLevel }) {
  return <AdminStatusBadge label={getRiskLevelLabel(level)} tone={getRiskLevelTone(level)} />
}
