import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import clsx from 'clsx'

type SectionStackProps<TElement extends ElementType = 'div'> = {
  as?: TElement
  children: ReactNode
  className?: string
} & Omit<ComponentPropsWithoutRef<TElement>, 'as' | 'children' | 'className'>

export default function SectionStack<TElement extends ElementType = 'div'>({
  as,
  children,
  className,
  ...props
}: SectionStackProps<TElement>) {
  const Component = as ?? 'div'

  return (
    <Component className={clsx('space-y-6', className)} {...props}>
      {children}
    </Component>
  )
}
