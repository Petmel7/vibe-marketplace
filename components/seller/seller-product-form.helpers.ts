export function hasUnsavedSellerProductChanges(params: {
  isProductDirty: boolean
  isGalleryDirty: boolean
  isExistingVariantsDirty: boolean
  isNewVariantDirty: boolean
}) {
  return (
    params.isProductDirty
    || params.isGalleryDirty
    || params.isExistingVariantsDirty
    || params.isNewVariantDirty
  )
}
