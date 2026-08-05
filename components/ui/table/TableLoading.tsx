import clsx from 'clsx'

export default function TableLoading({
  rows = 5,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={clsx('space-y-3 p-6', className)} aria-busy="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-2xl bg-panel/60" />
      ))}
    </div>
  )
}
