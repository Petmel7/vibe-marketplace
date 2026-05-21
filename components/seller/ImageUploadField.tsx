'use client'

import { useId } from 'react'
import ImagePreviewCard from '@/components/seller/ImagePreviewCard'

export default function ImageUploadField({
  label,
  description,
  file,
  imageUrl,
  alt,
  accept,
  errorMessage,
  statusLabel,
  disabled = false,
  onFileSelect,
  onClear,
}: {
  label: string
  description: string
  file: File | null
  imageUrl?: string | null
  alt: string
  accept: string
  errorMessage?: string | null
  statusLabel?: string
  disabled?: boolean
  onFileSelect: (file: File | null) => void
  onClear?: () => void
}) {
  const inputId = useId()
  const descriptionId = `${inputId}-description`
  const errorId = `${inputId}-error`

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label htmlFor={inputId} className="block text-sm font-medium text-copy-strong">
          {label}
        </label>
        <p id={descriptionId} className="text-sm text-copy-muted">
          {description}
        </p>
        <input
          id={inputId}
          type="file"
          accept={accept}
          disabled={disabled}
          aria-describedby={errorMessage ? `${descriptionId} ${errorId}` : descriptionId}
          aria-invalid={Boolean(errorMessage)}
          className="block w-full rounded-2xl border border-panelBorder bg-panel px-4 py-3 text-sm text-copy-secondary file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand/90"
          onChange={(event) => {
            onFileSelect(event.target.files?.[0] ?? null)
            event.currentTarget.value = ''
          }}
        />
        {errorMessage ? (
          <p id={errorId} className="text-sm text-brand-danger" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <ImagePreviewCard
        title={label}
        alt={alt}
        src={imageUrl}
        file={file}
        statusLabel={statusLabel}
        helperText={file ? file.name : imageUrl ? 'Current uploaded asset' : 'Select an image to preview it here.'}
      >
        {onClear ? (
          <button
            type="button"
            className="ui-secondary-button h-10 px-4 py-2 text-sm"
            disabled={disabled || (!file && !imageUrl)}
            onClick={onClear}
          >
            Remove
          </button>
        ) : null}
      </ImagePreviewCard>
    </div>
  )
}
