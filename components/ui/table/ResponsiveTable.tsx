import type { ReactNode } from 'react'

export default function ResponsiveTable({
  desktop,
  mobile,
  breakpoint = 'md',
}: {
  desktop: ReactNode
  mobile: ReactNode
  breakpoint?: 'md' | 'lg'
}) {
  const desktopClassName = breakpoint === 'lg' ? 'hidden lg:block' : 'hidden md:block'
  const mobileClassName = breakpoint === 'lg' ? 'lg:hidden' : 'md:hidden'

  return (
    <>
      <div className={desktopClassName}>{desktop}</div>
      <div className={mobileClassName}>{mobile}</div>
    </>
  )
}
