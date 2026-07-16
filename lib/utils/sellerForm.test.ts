import { describe, expect, it } from 'vitest'
import {
  generateBaseSkuDraft,
  getCreateSkuPayloadValue,
  getUpdateSkuPayloadValue,
} from './sellerForm'

describe('sellerForm SKU helpers', () => {
  it('keeps create-mode auto SKU in preview only and omits it from the payload', () => {
    const previewSku = generateBaseSkuDraft('Winter Jacket', 'maria')

    expect(previewSku).toBe('PRD-WINTER-JACKET-AUTO')
    expect(getCreateSkuPayloadValue(previewSku, false)).toBeUndefined()
  })

  it('sends the manually edited SKU in the payload', () => {
    expect(getCreateSkuPayloadValue(' custom-sku ', true)).toBe('custom-sku')
  })

  it('keeps update-mode manual clearing explicit for base product SKU', () => {
    expect(getUpdateSkuPayloadValue('', true)).toBeNull()
  })
})
