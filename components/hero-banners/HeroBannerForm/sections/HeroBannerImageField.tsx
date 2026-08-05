import { useId } from 'react'
import {
  ImagePreview,
  UploadActions,
  UploadCard,
  UploadDropzone,
  UploadError,
} from '@/components/ui/upload'
import type { HeroBannerImageSlot } from '@/features/media/media.dto'

export default function HeroBannerImageField({
  slot,
  label,
  description,
  imageUrl,
  imageAlt,
  disabled,
  errorMessage,
  onUpload,
  onRemove,
}: {
  slot: HeroBannerImageSlot
  label: string
  description: string
  imageUrl: string
  imageAlt: string
  disabled: boolean
  errorMessage?: string
  onUpload: (slot: HeroBannerImageSlot, file: File) => Promise<void>
  onRemove: (slot: HeroBannerImageSlot) => Promise<void>
}) {
  const inputId = useId()
  const descriptionId = `${inputId}-description`
  const errorId = `${inputId}-error`

  return (
    <UploadCard>
      <div className="space-y-1">
        <label htmlFor={inputId} className="block text-sm font-medium text-copy-strong">
          {label}
        </label>
        <UploadDropzone
          id={inputId}
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled}
          describedBy={errorMessage ? `${descriptionId} ${errorId}` : descriptionId}
          invalid={Boolean(errorMessage)}
          className="mt-3"
          onFilesSelected={(files) => {
            const file = files?.[0]
            if (file) {
              void onUpload(slot, file)
            }
          }}
        />
        <p id={descriptionId} className="text-sm text-copy-muted">{description}</p>
        <UploadError id={errorId}>{errorMessage}</UploadError>
      </div>
      <ImagePreview
        src={imageUrl}
        alt={imageAlt || label}
        emptyLabel="Зображення ще не завантажено"
        sizes="(max-width: 768px) 100vw, 360px"
        className="h-36 border-panelBorder"
      />
      <UploadActions compact>
        <button
          type="button"
          className="ui-secondary-button h-10 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || !imageUrl}
          onClick={() => void onRemove(slot)}
        >
          Видалити зображення
        </button>
      </UploadActions>
    </UploadCard>
  )
}
