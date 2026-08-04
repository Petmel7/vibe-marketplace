import type { ReactNode } from 'react'
import clsx from 'clsx'

type AlertTone = 'danger' | 'success' | 'neutral'

const toneClassName: Record<AlertTone, string> = {
  danger: 'border-brand-danger/30 bg-brand-danger/10 text-copy-primary',
  success: 'border-brand-success/30 bg-brand-success/10 text-copy-primary',
  neutral: 'border-panelBorder bg-panel/60 text-copy-muted',
}

export default function Alert({
  children,
  tone = 'neutral',
  className,
  role,
}: {
  children: ReactNode
  tone?: AlertTone
  className?: string
  role?: 'alert' | 'status'
}) {
  return (
    <div className={clsx('rounded-2xl border px-4 py-3 text-sm', toneClassName[tone], className)} role={role}>
      {children}
    </div>
  )
}
