import postgres from 'postgres'
import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const BATCH_SIZE = Number(process.env.BACKFILL_BATCH_SIZE ?? 200)
const DEFAULT_CATEGORY_SLUG = 'clothes'

const SKU_KEYWORDS = {
  clothes: ['TSHIRT', 'HOODIE', 'PANTS', 'SHIRT'],
  accessories: ['BAG', 'BELT', 'CAP', 'WATCH'],
  souvenirs: ['MUG', 'POSTER', 'STICKER'],
  stationery: ['PEN', 'NOTEBOOK', 'BOOK'],
}

const NAME_KEYWORDS = {
  clothes: ['футболка', 'худі', 'штани', 'одяг'],
  accessories: ['сумка', 'ремінь', 'кепка'],
  souvenirs: ['чашка', 'сувенір', 'стікер'],
  stationery: ['ручка', 'блокнот', 'зошит'],
}

const sql = postgres(databaseUrl, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
})

function findMatchingSlugBySku(sku) {
  if (!sku) return null

  const normalizedSku = sku.toUpperCase()

  for (const [slug, keywords] of Object.entries(SKU_KEYWORDS)) {
    if (keywords.some((keyword) => normalizedSku.includes(keyword))) {
      return slug
    }
  }

  return null
}

function findMatchingSlugByName(name) {
  const normalizedName = name.toLocaleLowerCase('uk-UA')

  for (const [slug, keywords] of Object.entries(NAME_KEYWORDS)) {
    if (keywords.some((keyword) => normalizedName.includes(keyword))) {
      return slug
    }
  }

  return null
}

function classifyProduct(product) {
  const skuSlug = findMatchingSlugBySku(product.sku)
  if (skuSlug) {
    return { slug: skuSlug, reason: 'sku' }
  }

  const nameSlug = findMatchingSlugByName(product.name)
  if (nameSlug) {
    return { slug: nameSlug, reason: 'name' }
  }

  return { slug: DEFAULT_CATEGORY_SLUG, reason: 'fallback' }
}

async function fetchCategoryMap() {
  const rows = await sql`
    SELECT id, slug
    FROM categories
  `

  const categoryMap = new Map(rows.map((row) => [row.slug, row.id]))
  const requiredSlugs = [
    DEFAULT_CATEGORY_SLUG,
    'accessories',
    'souvenirs',
    'stationery',
  ]

  const missingSlugs = requiredSlugs.filter((slug) => !categoryMap.has(slug))
  if (missingSlugs.length > 0) {
    throw new Error(`Missing categories for slugs: ${missingSlugs.join(', ')}`)
  }

  return categoryMap
}

async function fetchBatch() {
  return sql`
    SELECT id, name, sku
    FROM products
    WHERE category_id IS NULL
    ORDER BY created_at ASC, id ASC
    LIMIT ${BATCH_SIZE}
  `
}

function buildAssignments(products, categoryMap) {
  return products.map((product) => {
    const match = classifyProduct(product)
    const categoryId = categoryMap.get(match.slug)

    if (!categoryId) {
      throw new Error(`Category slug "${match.slug}" is not available in category map`)
    }

    return {
      productId: product.id,
      categoryId,
      slug: match.slug,
      reason: match.reason,
    }
  })
}

function groupAssignments(assignments) {
  const groups = new Map()

  for (const assignment of assignments) {
    const key = `${assignment.reason}:${assignment.slug}:${assignment.categoryId}`
    const current = groups.get(key) ?? {
      reason: assignment.reason,
      slug: assignment.slug,
      categoryId: assignment.categoryId,
      productIds: [],
    }

    current.productIds.push(assignment.productId)
    groups.set(key, current)
  }

  return [...groups.values()]
}

async function applyGroupUpdate(tx, group, summary) {
  try {
    const updatedRows = await tx`
      UPDATE products
      SET category_id = ${group.categoryId}
      WHERE category_id IS NULL
        AND id IN ${tx(group.productIds)}
      RETURNING id
    `

    const updatedCount = updatedRows.length
    summary.updated += updatedCount
    summary[group.reason] += updatedCount

    console.log(
      `[backfill] ${group.reason.toUpperCase()} matched ${updatedCount} product(s) -> ${group.slug}`,
    )
  } catch (error) {
    summary.errors += group.productIds.length
    console.error(
      `[backfill] Failed to update ${group.productIds.length} product(s) for ${group.slug} via ${group.reason}:`,
      error,
    )
  }
}

async function processBatch(batchNumber, categoryMap, summary) {
  const products = await fetchBatch()

  if (products.length === 0) {
    return false
  }

  console.log(`[backfill] Processing batch ${batchNumber} with ${products.length} product(s)`)

  let assignments
  try {
    assignments = buildAssignments(products, categoryMap)
  } catch (error) {
    throw new Error(`[backfill] Failed to classify batch ${batchNumber}: ${String(error)}`)
  }

  const groups = groupAssignments(assignments)
  const updatedBeforeBatch = summary.updated

  await sql.begin(async (tx) => {
    for (const group of groups) {
      await applyGroupUpdate(tx, group, summary)
    }
  })

  const batchSku = assignments.filter((item) => item.reason === 'sku').length
  const batchName = assignments.filter((item) => item.reason === 'name').length
  const batchFallback = assignments.filter((item) => item.reason === 'fallback').length

  console.log(
    `[backfill] Batch ${batchNumber} summary: sku=${batchSku}, name=${batchName}, fallback=${batchFallback}`,
  )

  if (summary.updated === updatedBeforeBatch) {
    throw new Error(
      `[backfill] Batch ${batchNumber} completed without updates. Stopping to avoid retrying the same NULL category records indefinitely.`,
    )
  }

  return true
}

async function main() {
  const summary = {
    updated: 0,
    sku: 0,
    name: 0,
    fallback: 0,
    errors: 0,
  }

  try {
    console.log(
      `[backfill] Starting category backfill with batch size ${BATCH_SIZE}. Fallback category: ${DEFAULT_CATEGORY_SLUG}`,
    )

    const categoryMap = await fetchCategoryMap()
    let batchNumber = 1

    while (await processBatch(batchNumber, categoryMap, summary)) {
      batchNumber += 1
    }

    console.log('[backfill] Completed category backfill')
    console.log(
      `[backfill] Summary: updated=${summary.updated}, matchedBySku=${summary.sku}, matchedByName=${summary.name}, fallbackAssigned=${summary.fallback}, errors=${summary.errors}`,
    )
  } catch (error) {
    console.error('[backfill] Fatal error during category backfill:', error)
    process.exitCode = 1
  } finally {
    await sql.end({ timeout: 5 })
  }
}

void main()
