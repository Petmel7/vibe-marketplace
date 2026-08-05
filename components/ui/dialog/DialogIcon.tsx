import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function DialogIcon({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'danger' | 'neutral' | 'success' | 'warning'
  className?: string
}) {
  const toneClassName = {
    danger: 'border-brand-danger/30 bg-brand-danger/10 text-brand-danger',
    neutral: 'border-panelBorder bg-panel text-copy-muted',
    success: 'border-brand-success/30 bg-brand-success/10 text-brand-success',
    warning: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  }[tone]

  return (
    <span className={clsx('inline-flex h-10 w-10 items-center justify-center rounded-2xl border', toneClassName, className)}>
      {children}
    </span>
  )
}
