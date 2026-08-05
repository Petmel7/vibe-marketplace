import { canArchiveProduct, canSubmitProductForReview } from '@/types/seller'
import type { ProductEditorValue } from '../types'

export default function SellerProductActionsSection({
  mode,
  initialProduct,
  isActionLocked,
  onArchive,
  onSubmitForReview,
}: {
  mode: 'create' | 'edit'
  initialProduct?: ProductEditorValue | null
  isActionLocked: boolean
  onArchive: () => void
  onSubmitForReview: () => void
}) {
  return (
    <div className="flex flex-col gap-3 min-[501px]:items-center">
      {initialProduct && canArchiveProduct(initialProduct.status) ? (
        <button
          type="button"
          className="w-full rounded-full border border-brand-danger/30 px-4 py-2 text-sm text-brand-danger transition-colors hover:bg-brand-danger/10 min-[501px]:w-fit"
          disabled={isActionLocked}
          onClick={onArchive}
        >
          Архівувати товар
        </button>
      ) : null}

      <div className="flex w-full flex-col gap-3 min-[501px]:w-auto min-[501px]:flex-row min-[501px]:justify-center">
        {initialProduct && canSubmitProductForReview(initialProduct.status) ? (
          <button
            type="button"
            className="ui-secondary-button w-full min-[501px]:w-64"
            disabled={isActionLocked}
            onClick={onSubmitForReview}
          >
            Надіслати на модерацію
          </button>
        ) : null}

        <button
          type="submit"
          className="ui-primary-button w-full min-[501px]:w-64"
          disabled={isActionLocked}
        >
          {mode === 'create' || initialProduct?.status === 'DRAFT'
            ? 'Зберегти чернетку'
            : 'Зберегти зміни'}
        </button>
      </div>
    </div>
  )
}
