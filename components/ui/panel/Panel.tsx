import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import clsx from 'clsx'

type PanelProps<TElement extends ElementType = 'section'> = {
  as?: TElement
  children: ReactNode
  className?: string
} & Omit<ComponentPropsWithoutRef<TElement>, 'as' | 'children' | 'className'>

export default function Panel<TElement extends ElementType = 'section'>({
  as,
  children,
  className,
  ...props
}: PanelProps<TElement>) {
  const Component = as ?? 'section'

  return (
    <Component className={clsx('ui-elevated-panel p-5 sm:p-6', className)} {...props}>
      {children}
    </Component>
  )
}
