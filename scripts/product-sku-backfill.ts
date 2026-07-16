import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import {
  executeProductSkuBackfill,
  type ProductSkuAuditRecord,
  type ProductSkuBackfillAction,
} from '@/features/seller/products/seller-product-sku-backfill'

const DEFAULT_BATCH_SIZE = Number(process.env.PRODUCT_SKU_BACKFILL_BATCH_SIZE ?? 100)

type CliOptions = {
  apply: boolean
  canonicalizeInvalid: boolean
  batchSize: number
}

function parseCliOptions(argv: string[]): CliOptions {
  let apply = false
  let canonicalizeInvalid = false
  let batchSize = DEFAULT_BATCH_SIZE

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--apply') {
      apply = true
      continue
    }

    if (arg === '--canonicalize-invalid') {
      canonicalizeInvalid = true
      continue
    }

    if (arg === '--batch-size') {
      const next = argv[index + 1]
      const parsed = Number(next)

      if (!next || !Number.isInteger(parsed) || parsed <= 0) {
        throw new Error('Expected a positive integer after --batch-size')
      }

      batchSize = parsed
      index += 1
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return { apply, canonicalizeInvalid, batchSize }
}

async function loadProductSkuRecords(): Promise<ProductSkuAuditRecord[]> {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      storeId: true,
      name: true,
      sku: true,
      createdAt: true,
      store: {
        select: {
          slug: true,
        },
      },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })

  return products.map((product) => ({
    id: product.id,
    storeId: product.storeId,
    storeSlug: product.store.slug,
    name: product.name,
    sku: product.sku,
    createdAt: product.createdAt,
  }))
}

function printActionPreview(actions: ProductSkuBackfillAction[]) {
  if (actions.length === 0) {
    console.log('[sku-backfill] No product SKUs require remediation.')
    return
  }

  const previewLimit = 50
  const preview = actions.slice(0, previewLimit)

  console.log(`[sku-backfill] Planned remediations (${actions.length} total):`)
  for (const action of preview) {
    console.log(
      `  - product=${action.productId} store=${action.storeId} current=${JSON.stringify(action.currentSku)} proposed=${action.proposedSku} reasons=${action.reasons.join(',')}`,
    )
  }

  if (actions.length > previewLimit) {
    console.log(`[sku-backfill] ... ${actions.length - previewLimit} additional product(s) omitted from console preview`)
  }
}

function printDuplicateGroups(label: string, groups: Array<{ key: string; count: number; productIds: string[] }>) {
  if (groups.length === 0) {
    console.log(`[sku-backfill] ${label}: none`)
    return
  }

  console.log(`[sku-backfill] ${label}:`)
  for (const group of groups) {
    console.log(`  - key=${group.key} count=${group.count} productIds=${group.productIds.join(',')}`)
  }
}

async function persistBatch(batch: ProductSkuBackfillAction[]) {
  await prisma.$transaction(
    batch.map((action) =>
      prisma.product.update({
        where: { id: action.productId },
        data: {
          sku: action.proposedSku,
          updatedAt: new Date(),
        },
      }),
    ),
  )
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2))

  console.log(
    `[sku-backfill] Starting product SKU ${options.apply ? 'backfill' : 'audit'} on July 16, 2026 with batch size ${options.batchSize}${options.canonicalizeInvalid ? ' and canonicalization enabled' : ''}.`,
  )

  const records = await loadProductSkuRecords()
  const result = await executeProductSkuBackfill(records, {
    apply: options.apply,
    canonicalizeInvalid: options.canonicalizeInvalid,
    batchSize: options.batchSize,
    persistBatch: options.apply ? persistBatch : undefined,
  })

  console.log(`[sku-backfill] Total product count: ${result.audit.summary.totalProductCount}`)
  console.log(`[sku-backfill] Null SKU count: ${result.audit.summary.nullSkuCount}`)
  console.log(`[sku-backfill] Empty/whitespace SKU count: ${result.audit.summary.emptySkuCount}`)
  console.log(`[sku-backfill] Invalid SKU count: ${result.audit.summary.invalidSkuCount}`)
  console.log(`[sku-backfill] Non-canonical SKU count: ${result.audit.summary.nonCanonicalSkuCount}`)
  console.log(`[sku-backfill] Valid unique SKU count: ${result.audit.summary.validUniqueSkuCount}`)
  printDuplicateGroups('Duplicate exact SKU groups', result.audit.duplicateExactGroups)
  printDuplicateGroups('Duplicate normalized SKU groups', result.audit.duplicateNormalizedGroups)
  printActionPreview(result.audit.actions)

  console.log(
    `[sku-backfill] Final summary: audited=${result.audited} unchanged=${result.unchanged} updated=${result.updated} duplicatesResolved=${result.duplicatesResolved} failures=${result.failures} planned=${result.planned}`,
  )

  if (!options.apply) {
    console.log('[sku-backfill] Dry-run complete. Re-run with --apply to persist remediation updates.')
  }
}

void main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[sku-backfill] Fatal error: ${message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
