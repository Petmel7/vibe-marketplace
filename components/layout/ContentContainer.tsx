import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import clsx from 'clsx'

type ContentContainerSize = 'content' | 'narrow' | 'wide'

const sizeClassName: Record<ContentContainerSize, string> = {
  content: 'max-w-5xl',
  narrow: 'max-w-4xl',
  wide: 'max-w-7xl',
}

type ContentContainerProps<TElement extends ElementType = 'main'> = {
  as?: TElement
  children: ReactNode
  className?: string
  gutter?: boolean
  size?: ContentContainerSize
} & Omit<ComponentPropsWithoutRef<TElement>, 'as' | 'children' | 'className'>

export default function ContentContainer<TElement extends ElementType = 'main'>({
  as,
  children,
  className,
  gutter = true,
  size = 'content',
  ...props
}: ContentContainerProps<TElement>) {
  const Component = as ?? 'main'

  return (
    <Component
      className={clsx('mx-auto w-full', gutter ? 'px-4 sm:px-6 lg:px-6' : '', sizeClassName[size], className)}
      {...props}
    >
      {children}
    </Component>
  )
}
