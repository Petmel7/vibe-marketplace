import clsx from 'clsx'

export default function FormDivider({ className }: { className?: string }) {
  return <hr className={clsx('border-panelBorder', className)} />
}
