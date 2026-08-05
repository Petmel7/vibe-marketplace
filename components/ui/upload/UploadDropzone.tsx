'use client'

import type { ChangeEvent, ReactNode } from 'react'
import clsx from 'clsx'

export default function UploadDropzone({
  id,
  accept,
  multiple = false,
  disabled = false,
  describedBy,
  invalid = false,
  children,
  className,
  onFilesSelected,
}: {
  id?: string
  accept?: string
  multiple?: boolean
  disabled?: boolean
  describedBy?: string
  invalid?: boolean
  children?: ReactNode
  className?: string
  onFilesSelected: (files: FileList | null) => void
}) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onFilesSelected(event.target.files)
    event.currentTarget.value = ''
  }

  return (
    <div className={clsx('space-y-2', className)}>
      <input
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        className="block w-full rounded-2xl border border-panelBorder bg-panel px-4 py-3 text-sm text-copy-secondary file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
        onChange={handleChange}
      />
      {children}
    </div>
  )
}
