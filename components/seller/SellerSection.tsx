import type { ReactNode } from 'react'
import DashboardSection from '@/components/ui/layout/DashboardSection'

export default function SellerSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <DashboardSection eyebrow={eyebrow} title={title} description={description}>
      {children}
    </DashboardSection>
  )
}
