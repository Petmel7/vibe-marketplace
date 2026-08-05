import clsx from 'clsx'

export default function DialogLoadingOverlay({
  label = 'Зачекайте…',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div className={clsx('absolute inset-0 z-10 grid place-items-center rounded-[inherit] bg-background/60 backdrop-blur-[1px]', className)}>
      <span className="rounded-full border border-panelBorder bg-panel px-4 py-2 text-sm text-copy-secondary">
        {label}
      </span>
    </div>
  )
}
