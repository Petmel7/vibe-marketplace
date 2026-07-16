import { generateBaseSku, isCanonicalProductSku, normalizeSku } from './seller-product.utils'

const DEFAULT_BACKFILL_BATCH_SIZE = 100
const MAX_GENERATED_SKU_ATTEMPTS = 25

export type ProductSkuAuditRecord = {
  id: string
  storeId: string
  storeSlug: string | null
  name: string
  sku: string | null
  createdAt: Date
}

export type ProductSkuIssueReason =
  | 'null'
  | 'empty'
  | 'duplicate-exact'
  | 'duplicate-normalized'
  | 'invalid'
  | 'non-canonical'

export type ProductSkuDuplicateGroup = {
  key: string
  productIds: string[]
  count: number
}

export type ProductSkuBackfillAction = {
  productId: string
  storeId: string
  currentSku: string | null
  proposedSku: string
  reasons: ProductSkuIssueReason[]
}

export type ProductSkuAuditSummary = {
  totalProductCount: number
  nullSkuCount: number
  emptySkuCount: number
  duplicateExactGroupCount: number
  duplicateNormalizedGroupCount: number
  invalidSkuCount: number
  nonCanonicalSkuCount: number
  validUniqueSkuCount: number
}

export type ProductSkuAuditReport = {
  summary: ProductSkuAuditSummary
  duplicateExactGroups: ProductSkuDuplicateGroup[]
  duplicateNormalizedGroups: ProductSkuDuplicateGroup[]
  invalidSkuProducts: Array<{
    productId: string
    storeId: string
    currentSku: string
    normalizedSku: string
  }>
  nonCanonicalSkuProducts: Array<{
    productId: string
    storeId: string
    currentSku: string
    normalizedSku: string
  }>
  actions: ProductSkuBackfillAction[]
}

export type ExecuteProductSkuBackfillOptions = {
  apply?: boolean
  batchSize?: number
  canonicalizeInvalid?: boolean
  persistBatch?: (batch: ProductSkuBackfillAction[]) => Promise<void>
}

export type ExecuteProductSkuBackfillResult = {
  audit: ProductSkuAuditReport
  audited: number
  unchanged: number
  updated: number
  planned: number
  duplicatesResolved: number
  failures: number
  applyMode: boolean
}

type ProductSkuInspection = {
  record: ProductSkuAuditRecord
  trimmedSku: string | null
  normalizedSku: string | null
  isCanonical: boolean
}

function compareRecords(a: ProductSkuAuditRecord, b: ProductSkuAuditRecord) {
  const createdAtDiff = a.createdAt.getTime() - b.createdAt.getTime()
  if (createdAtDiff !== 0) {
    return createdAtDiff
  }

  return a.id.localeCompare(b.id)
}

function buildDuplicateGroups(
  inspections: ProductSkuInspection[],
  keySelector: (inspection: ProductSkuInspection) => string | null,
) {
  const groups = new Map<string, ProductSkuInspection[]>()

  for (const inspection of inspections) {
    const key = keySelector(inspection)
    if (!key) {
      continue
    }

    const current = groups.get(key) ?? []
    current.push(inspection)
    groups.set(key, current)
  }

  return [...groups.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({
      key,
      items: items.slice().sort((left, right) => compareRecords(left.record, right.record)),
    }))
}

function chooseDuplicateKeeper(items: ProductSkuInspection[]) {
  return items
    .slice()
    .sort((left, right) => {
      const leftCanonicalScore = left.isCanonical ? 1 : 0
      const rightCanonicalScore = right.isCanonical ? 1 : 0

      if (leftCanonicalScore !== rightCanonicalScore) {
        return rightCanonicalScore - leftCanonicalScore
      }

      const leftNormalizedScore = left.trimmedSku && left.normalizedSku === left.trimmedSku ? 1 : 0
      const rightNormalizedScore = right.trimmedSku && right.normalizedSku === right.trimmedSku ? 1 : 0

      if (leftNormalizedScore !== rightNormalizedScore) {
        return rightNormalizedScore - leftNormalizedScore
      }

      return compareRecords(left.record, right.record)
    })[0]
}

function inspectRecords(records: ProductSkuAuditRecord[]) {
  return records
    .slice()
    .sort(compareRecords)
    .map<ProductSkuInspection>((record) => {
      const trimmedSku = record.sku?.trim() ?? null
      const normalizedSku = trimmedSku ? normalizeSku(trimmedSku) : null

      return {
        record,
        trimmedSku,
        normalizedSku,
        isCanonical: trimmedSku ? isCanonicalProductSku(trimmedSku) : false,
      }
    })
}

function buildUniqueProductSku(
  record: ProductSkuAuditRecord,
  reservedNormalizedSkus: Set<string>,
) {
  for (let attempt = 0; attempt < MAX_GENERATED_SKU_ATTEMPTS; attempt += 1) {
    const candidate = generateBaseSku(record.name, record.storeSlug ?? '')
    const normalizedCandidate = normalizeSku(candidate)

    if (!normalizedCandidate || reservedNormalizedSkus.has(normalizedCandidate)) {
      continue
    }

    reservedNormalizedSkus.add(normalizedCandidate)
    return candidate
  }

  throw new Error(`Unable to generate a unique SKU for product ${record.id}`)
}

export function auditProductSkus(
  records: ProductSkuAuditRecord[],
  options?: { canonicalizeInvalid?: boolean },
): ProductSkuAuditReport {
  const canonicalizeInvalid = options?.canonicalizeInvalid ?? false
  const inspections = inspectRecords(records)
  const exactDuplicateGroups = buildDuplicateGroups(inspections, (inspection) => inspection.trimmedSku)
  const normalizedDuplicateGroups = buildDuplicateGroups(inspections, (inspection) => inspection.normalizedSku)

  const exactDuplicateKeepers = new Map<string, string>()
  const normalizedDuplicateKeepers = new Map<string, string>()

  for (const group of exactDuplicateGroups) {
    exactDuplicateKeepers.set(group.key, chooseDuplicateKeeper(group.items).record.id)
  }

  for (const group of normalizedDuplicateGroups) {
    normalizedDuplicateKeepers.set(group.key, chooseDuplicateKeeper(group.items).record.id)
  }

  const invalidSkuProducts: ProductSkuAuditReport['invalidSkuProducts'] = []
  const nonCanonicalSkuProducts: ProductSkuAuditReport['nonCanonicalSkuProducts'] = []
  const actionCandidates: Array<{
    inspection: ProductSkuInspection
    reasons: ProductSkuIssueReason[]
  }> = []

  for (const inspection of inspections) {
    const reasons: ProductSkuIssueReason[] = []

    if (inspection.record.sku == null) {
      reasons.push('null')
    } else if (!inspection.trimmedSku) {
      reasons.push('empty')
    } else if (!inspection.normalizedSku) {
      reasons.push('invalid')
    } else {
      const exactKeeperId = exactDuplicateKeepers.get(inspection.trimmedSku)
      if (exactKeeperId && exactKeeperId !== inspection.record.id) {
        reasons.push('duplicate-exact')
      }

      const normalizedKeeperId = normalizedDuplicateKeepers.get(inspection.normalizedSku)
      if (normalizedKeeperId && normalizedKeeperId !== inspection.record.id) {
        reasons.push('duplicate-normalized')
      }

      if (inspection.normalizedSku !== inspection.trimmedSku) {
        reasons.push('non-canonical')
      }
    }

    if (reasons.includes('invalid')) {
      invalidSkuProducts.push({
        productId: inspection.record.id,
        storeId: inspection.record.storeId,
        currentSku: inspection.record.sku ?? '',
        normalizedSku: inspection.normalizedSku ?? '',
      })
    }

    if (reasons.includes('non-canonical')) {
      nonCanonicalSkuProducts.push({
        productId: inspection.record.id,
        storeId: inspection.record.storeId,
        currentSku: inspection.record.sku ?? '',
        normalizedSku: inspection.normalizedSku ?? '',
      })
    }

    const needsRemediation = reasons.some((reason) =>
      reason === 'null'
      || reason === 'empty'
      || reason === 'duplicate-exact'
      || reason === 'duplicate-normalized'
      || reason === 'invalid'
      || (canonicalizeInvalid && reason === 'non-canonical'),
    )

    if (needsRemediation) {
      actionCandidates.push({ inspection, reasons })
    }
  }

  const actionProductIds = new Set(actionCandidates.map((candidate) => candidate.inspection.record.id))
  const reservedNormalizedSkus = new Set(
    inspections
      .filter((inspection) => !actionProductIds.has(inspection.record.id))
      .map((inspection) => inspection.normalizedSku)
      .filter((value): value is string => Boolean(value)),
  )

  const actions = actionCandidates.map<ProductSkuBackfillAction>(({ inspection, reasons }) => ({
    productId: inspection.record.id,
    storeId: inspection.record.storeId,
    currentSku: inspection.record.sku,
    proposedSku: buildUniqueProductSku(inspection.record, reservedNormalizedSkus),
    reasons,
  }))

  const summary: ProductSkuAuditSummary = {
    totalProductCount: inspections.length,
    nullSkuCount: inspections.filter((inspection) => inspection.record.sku == null).length,
    emptySkuCount: inspections.filter((inspection) => inspection.record.sku != null && !inspection.trimmedSku).length,
    duplicateExactGroupCount: exactDuplicateGroups.length,
    duplicateNormalizedGroupCount: normalizedDuplicateGroups.length,
    invalidSkuCount: invalidSkuProducts.length,
    nonCanonicalSkuCount: nonCanonicalSkuProducts.length,
    validUniqueSkuCount: inspections.length - actions.length,
  }

  return {
    summary,
    duplicateExactGroups: exactDuplicateGroups.map((group) => ({
      key: group.key,
      productIds: group.items.map((item) => item.record.id),
      count: group.items.length,
    })),
    duplicateNormalizedGroups: normalizedDuplicateGroups.map((group) => ({
      key: group.key,
      productIds: group.items.map((item) => item.record.id),
      count: group.items.length,
    })),
    invalidSkuProducts,
    nonCanonicalSkuProducts,
    actions,
  }
}

export async function executeProductSkuBackfill(
  records: ProductSkuAuditRecord[],
  options?: ExecuteProductSkuBackfillOptions,
): Promise<ExecuteProductSkuBackfillResult> {
  const applyMode = options?.apply ?? false
  const batchSize = options?.batchSize ?? DEFAULT_BACKFILL_BATCH_SIZE
  const audit = auditProductSkus(records, { canonicalizeInvalid: options?.canonicalizeInvalid })
  const planned = audit.actions.length

  if (!applyMode) {
    return {
      audit,
      audited: audit.summary.totalProductCount,
      unchanged: audit.summary.totalProductCount - planned,
      updated: 0,
      planned,
      duplicatesResolved: audit.actions.filter((action) =>
        action.reasons.includes('duplicate-exact') || action.reasons.includes('duplicate-normalized'),
      ).length,
      failures: 0,
      applyMode: false,
    }
  }

  if (!options?.persistBatch) {
    throw new Error('persistBatch is required in apply mode')
  }

  let updated = 0

  for (let index = 0; index < audit.actions.length; index += batchSize) {
    const batch = audit.actions.slice(index, index + batchSize)
    await options.persistBatch(batch)
    updated += batch.length
  }

  return {
    audit,
    audited: audit.summary.totalProductCount,
    unchanged: audit.summary.totalProductCount - planned,
    updated,
    planned,
    duplicatesResolved: audit.actions.filter((action) =>
      action.reasons.includes('duplicate-exact') || action.reasons.includes('duplicate-normalized'),
    ).length,
    failures: 0,
    applyMode: true,
  }
}
