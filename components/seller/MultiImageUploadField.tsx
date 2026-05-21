'use client'

import ImagePreviewCard from '@/components/seller/ImagePreviewCard'
import type { ProductImageDraft } from '@/hooks/useProductImageUpload'

export default function MultiImageUploadField({
  label,
  description,
  items,
  disabled = false,
  errorMessage,
  onFilesSelected,
  onRemove,
  onMove,
  onSetPrimary,
  onAltTextChange,
}: {
  label: string
  description: string
  items: ProductImageDraft[]
  disabled?: boolean
  errorMessage?: string | null
  onFilesSelected: (files: File[]) => void
  onRemove: (id: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
  onSetPrimary: (id: string) => void
  onAltTextChange: (id: string, value: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-copy-strong">{label}</label>
        <p className="text-sm text-copy-muted">{description}</p>
        <input
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp"
          disabled={disabled}
          className="block w-full rounded-2xl border border-panelBorder bg-panel px-4 py-3 text-sm text-copy-secondary file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand/90"
          onChange={(event) => {
            onFilesSelected(Array.from(event.target.files ?? []))
            event.currentTarget.value = ''
          }}
        />
        {errorMessage ? (
          <p className="text-sm text-brand-danger" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-panelBorder bg-panel px-5 py-10 text-center text-sm text-copy-muted">
          Upload product images to build a gallery, choose a primary image, and control image order.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item, index) => (
            <div key={item.id} className="space-y-3">
              <ImagePreviewCard
                title={`Image ${index + 1}`}
                alt={item.altText || `Product image ${index + 1}`}
                src={item.source === 'server' ? item.url : undefined}
                file={item.file}
                isPrimary={item.isPrimary}
                statusLabel={item.source === 'server' ? 'Uploaded' : 'Ready to upload'}
                helperText={item.source === 'server' ? 'Saved to your gallery' : item.file?.name ?? 'Selected file'}
              >
                <button
                  type="button"
                  className="ui-secondary-button h-10 px-4 py-2 text-sm"
                  disabled={disabled || item.isPrimary}
                  onClick={() => onSetPrimary(item.id)}
                >
                  Set primary
                </button>
                <button
                  type="button"
                  className="ui-secondary-button h-10 px-4 py-2 text-sm"
                  disabled={disabled || index === 0}
                  onClick={() => onMove(item.id, 'up')}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className="ui-secondary-button h-10 px-4 py-2 text-sm"
                  disabled={disabled || index === items.length - 1}
                  onClick={() => onMove(item.id, 'down')}
                >
                  Move down
                </button>
                <button
                  type="button"
                  className="rounded-full border border-brand-danger/30 px-4 py-2 text-sm text-brand-danger transition-colors hover:bg-brand-danger/10"
                  disabled={disabled}
                  onClick={() => onRemove(item.id)}
                >
                  Remove
                </button>
              </ImagePreviewCard>

              <label className="space-y-2">
                <span className="block text-sm font-medium text-copy-strong">Alt text</span>
                <input
                  className="ui-surface-input"
                  value={item.altText}
                  disabled={disabled}
                  onChange={(event) => onAltTextChange(item.id, event.target.value)}
                  placeholder="Describe the product image for accessibility"
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
