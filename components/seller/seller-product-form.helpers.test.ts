import { describe, expect, it } from 'vitest'
import { hasUnsavedSellerProductChanges } from './seller-product-form.helpers'

describe('hasUnsavedSellerProductChanges', () => {
  it('returns false when every editable seller product section is clean', () => {
    expect(
      hasUnsavedSellerProductChanges({
        isProductDirty: false,
        isGalleryDirty: false,
        isExistingVariantsDirty: false,
        isNewVariantDirty: false,
      }),
    ).toBe(false)
  })

  it('returns true when at least one seller product section has unsaved changes', () => {
    expect(
      hasUnsavedSellerProductChanges({
        isProductDirty: false,
        isGalleryDirty: true,
        isExistingVariantsDirty: false,
        isNewVariantDirty: false,
      }),
    ).toBe(true)
  })
})
