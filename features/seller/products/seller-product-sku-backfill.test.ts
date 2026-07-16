import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  auditProductSkus,
  executeProductSkuBackfill,
  type ProductSkuAuditRecord,
} from './seller-product-sku-backfill'

function createRecord(overrides: Partial<ProductSkuAuditRecord> = {}): ProductSkuAuditRecord {
  return {
    id: 'product-1',
    storeId: 'store-1',
    storeSlug: 'store-one',
    name: 'Winter Jacket',
    sku: 'PRD-WINTER-JACKET-AAAA1111',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('seller product SKU backfill audit', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('assigns a generated SKU to a product with a null SKU', () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('11111111-1111-1111-1111-111111111111')

    const report = auditProductSkus([
      createRecord({ id: 'product-1', sku: null }),
    ])

    expect(report.actions).toHaveLength(1)
    expect(report.actions[0]).toMatchObject({
      productId: 'product-1',
      currentSku: null,
      proposedSku: 'PRD-WINTER-JACKET-11111111',
      reasons: ['null'],
    })
  })

  it('resolves duplicate SKU groups while preserving the first deterministic keeper', () => {
    vi.spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValueOnce('11111111-1111-1111-1111-111111111111')

    const report = auditProductSkus([
      createRecord({
        id: 'product-1',
        sku: 'PRD-WINTER-JACKET-AAAA1111',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
      createRecord({
        id: 'product-2',
        storeId: 'store-2',
        storeSlug: 'store-two',
        sku: 'PRD-WINTER-JACKET-AAAA1111',
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      }),
    ])

    expect(report.duplicateExactGroups).toHaveLength(1)
    expect(report.actions).toHaveLength(1)
    expect(report.actions[0]).toMatchObject({
      productId: 'product-2',
      proposedSku: 'PRD-WINTER-JACKET-11111111',
    })
    expect(report.actions[0]?.reasons).toContain('duplicate-exact')
  })

  it('keeps an already valid unique SKU unchanged', () => {
    const report = auditProductSkus([
      createRecord(),
    ])

    expect(report.actions).toHaveLength(0)
    expect(report.summary.validUniqueSkuCount).toBe(1)
  })

  it('does not generate collisions inside the same remediation batch', () => {
    vi.spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValueOnce('11111111-1111-1111-1111-111111111111')
      .mockReturnValueOnce('11111111-1111-1111-1111-111111111111')
      .mockReturnValueOnce('22222222-2222-2222-2222-222222222222')

    const report = auditProductSkus([
      createRecord({ id: 'product-1', sku: null }),
      createRecord({ id: 'product-2', sku: null, createdAt: new Date('2026-01-02T00:00:00.000Z') }),
    ])

    expect(report.actions).toHaveLength(2)
    expect(report.actions[0]?.proposedSku).toBe('PRD-WINTER-JACKET-11111111')
    expect(report.actions[1]?.proposedSku).toBe('PRD-WINTER-JACKET-22222222')
  })
})

describe('seller product SKU backfill execution', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('does not perform writes in dry-run mode', async () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('11111111-1111-1111-1111-111111111111')
    const persistBatch = vi.fn()

    const result = await executeProductSkuBackfill(
      [createRecord({ sku: null })],
      {
        apply: false,
        persistBatch,
      },
    )

    expect(persistBatch).not.toHaveBeenCalled()
    expect(result.updated).toBe(0)
    expect(result.planned).toBe(1)
  })

  it('is idempotent on a second apply run', async () => {
    const records = [
      createRecord({ id: 'product-1', sku: null }),
      createRecord({
        id: 'product-2',
        sku: 'PRD-WINTER-JACKET-AAAA1111',
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      }),
    ]

    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('11111111-1111-1111-1111-111111111111')

    const persistBatch = vi.fn(async (batch: Array<{ productId: string; proposedSku: string }>) => {
      for (const action of batch) {
        const record = records.find((entry) => entry.id === action.productId)
        if (record) {
          record.sku = action.proposedSku
        }
      }
    })

    const firstRun = await executeProductSkuBackfill(records, {
      apply: true,
      persistBatch,
    })
    const secondRun = await executeProductSkuBackfill(records, {
      apply: true,
      persistBatch,
    })

    expect(firstRun.updated).toBe(1)
    expect(secondRun.updated).toBe(0)
    expect(secondRun.planned).toBe(0)
    expect(persistBatch).toHaveBeenCalledTimes(1)
  })
})
