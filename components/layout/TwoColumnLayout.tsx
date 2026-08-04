import type { ReactNode } from 'react'
import clsx from 'clsx'

type TwoColumnLayoutVariant = 'balanced' | 'detailAside' | 'even' | 'wideAside'

const variantClassName: Record<TwoColumnLayoutVariant, string> = {
  balanced: 'xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]',
  detailAside: 'xl:grid-cols-[minmax(0,1.05fr)_360px]',
  even: 'xl:grid-cols-2',
  wideAside: 'xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]',
}

export default function TwoColumnLayout({
  children,
  variant = 'balanced',
  className,
}: {
  children: ReactNode
  variant?: TwoColumnLayoutVariant
  className?: string
}) {
  return <div className={clsx('grid gap-6', variantClassName[variant], className)}>{children}</div>
}
