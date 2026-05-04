import "dotenv/config";
import postgres from 'postgres'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const BATCH_SIZE = Number(process.env.BACKFILL_BATCH_SIZE ?? 200)

const DEFAULT_ROOT_SLUG = 'clothing-shoes'

const DEFAULT_LEAF_BY_ROOT = {
  'clothing-shoes': 'other-unisex-clothing',
  accessories: 'other-wear-accessories',
  souvenirs: 'other-gift-souvenirs',
  stationery: 'other-office-supplies',
}

const REQUIRED_LEAF_SLUGS = [
  'womens-dresses',
  'womens-outerwear',
  'womens-tops',
  'womens-bottoms',
  'other-womens-clothing',
  'mens-tops',
  'mens-hoodies-sweatshirts',
  'mens-pants',
  'mens-outerwear',
  'other-mens-clothing',
  'girls-clothing',
  'boys-clothing',
  'baby-clothing',
  'other-kids-clothing',
  'womens-shoes',
  'mens-shoes',
  'kids-shoes',
  'other-footwear',
  'other-unisex-clothing',
  'womens-bags',
  'mens-bags',
  'backpacks',
  'other-bags',
  'jewelry',
  'watches',
  'other-jewelry-watches',
  'belts',
  'wallets',
  'other-wear-accessories',
  'caps-baseball-caps',
  'winter-hats',
  'other-headwear',
  'mugs-tumblers',
  'posters-art',
  'magnets-decor',
  'other-home-decor-souvenirs',
  'keychains',
  'stickers',
  'pins-badges',
  'other-gift-souvenirs',
  'pens-pencils',
  'markers-highlighters',
  'other-writing-supplies',
  'notebooks',
  'notepads',
  'planners',
  'other-paper-goods',
  'folders-organizers',
  'desk-accessories',
  'other-office-supplies',
]

const sql = postgres(databaseUrl, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
})

function normalize(text) {
  return text.toLocaleLowerCase('uk-UA')
}

function buildHaystack(product) {
  return normalize(`${product.name ?? ''} ${product.sku ?? ''}`)
}

function hasAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword))
}

function detectRootSlug(product) {
  if (product.currentSlug && Object.hasOwn(DEFAULT_LEAF_BY_ROOT, product.currentSlug)) {
    return product.currentSlug
  }

  const haystack = buildHaystack(product)

  if (
    hasAny(haystack, [
      'рюкзак',
      'сумк',
      'bag',
      'backpack',
      'ремін',
      'belt',
      'гаман',
      'wallet',
      'кепк',
      'бейсболк',
      'шапк',
      'cap',
      'hat',
      'годин',
      'watch',
      'прикрас',
      'браслет',
      'каблуч',
      'necklace',
      'bracelet',
      'ring',
      'scarf',
    ])
  ) {
    return 'accessories'
  }

  if (
    hasAny(haystack, [
      'сувен',
      'чашк',
      'термочаш',
      'mug',
      'tumbler',
      'постер',
      'poster',
      'стікер',
      'sticker',
      'наліпк',
      'брелок',
      'keychain',
      'магніт',
      'magnet',
      'значок',
      'badge',
    ])
  ) {
    return 'souvenirs'
  }

  if (
    hasAny(haystack, [
      'ручк',
      'олів',
      'pen',
      'pencil',
      'маркер',
      'marker',
      'зошит',
      'notebook',
      'блокнот',
      'notepad',
      'щоден',
      'planner',
      'папк',
      'folder',
      'органайзер',
      'канцел',
    ])
  ) {
    return 'stationery'
  }

  return DEFAULT_ROOT_SLUG
}

function detectLeafSlug(rootSlug, product) {
  const haystack = buildHaystack(product)

  const isWomens = hasAny(haystack, ['жіноч', 'жін', 'дівч', 'female', 'women', 'woman', 'lady'])
  const isMens = hasAny(haystack, ['чоловіч', 'чолов', 'male', 'men', 'man'])
  const isKids = hasAny(haystack, ['дит', 'kid', 'kids', 'child', 'teen', 'підліт'])
  const isBaby = hasAny(haystack, ['немов', 'малюк', 'baby', 'infant'])
  const isGirls = hasAny(haystack, ['дівчат', 'girl'])
  const isBoys = hasAny(haystack, ['хлопц', 'boy'])

  if (rootSlug === 'clothing-shoes') {
    if (hasAny(haystack, ['взут', 'кросів', 'кед', 'черев', 'чоб', 'туфл', 'ботин', 'сандал', 'shoe', 'sneaker', 'boot', 'loafer', 'slipper'])) {
      if (isKids || isBaby || isGirls || isBoys) return 'kids-shoes'
      if (isMens) return 'mens-shoes'
      if (isWomens) return 'womens-shoes'
      return 'other-footwear'
    }

    if (isBaby) return 'baby-clothing'
    if (isGirls) return 'girls-clothing'
    if (isBoys) return 'boys-clothing'
    if (isKids) return 'other-kids-clothing'

    if (isWomens) {
      if (hasAny(haystack, ['сукн', 'dress'])) return 'womens-dresses'
      if (hasAny(haystack, ['куртк', 'пальт', 'пухов', 'ветров', 'жакет', 'coat', 'jacket', 'outerwear'])) return 'womens-outerwear'
      if (hasAny(haystack, ['футбол', 'топ', 'майк', 'блуз', 'сороч', 'tee', 't-shirt', 'shirt', 'top'])) return 'womens-tops'
      if (hasAny(haystack, ['штани', 'спідниц', 'джинс', 'легінс', 'pants', 'jeans', 'skirt', 'trousers'])) return 'womens-bottoms'
      return 'other-womens-clothing'
    }

    if (isMens) {
      if (hasAny(haystack, ['худі', 'світшот', 'hoodie', 'sweatshirt'])) return 'mens-hoodies-sweatshirts'
      if (hasAny(haystack, ['куртк', 'пальт', 'пухов', 'ветров', 'coat', 'jacket', 'outerwear'])) return 'mens-outerwear'
      if (hasAny(haystack, ['штани', 'джинс', 'брюк', 'pants', 'jeans', 'trousers'])) return 'mens-pants'
      if (hasAny(haystack, ['футбол', 'сороч', 'поло', 'tee', 't-shirt', 'shirt', 'polo'])) return 'mens-tops'
      return 'other-mens-clothing'
    }

    return DEFAULT_LEAF_BY_ROOT[rootSlug]
  }

  if (rootSlug === 'accessories') {
    if (hasAny(haystack, ['рюкзак', 'backpack'])) return 'backpacks'
    if (hasAny(haystack, ['сумк', 'bag'])) {
      if (isMens) return 'mens-bags'
      if (isWomens) return 'womens-bags'
      return 'other-bags'
    }
    if (hasAny(haystack, ['годин', 'watch'])) return 'watches'
    if (hasAny(haystack, ['прикрас', 'сереж', 'намист', 'підвіск', 'каблуч', 'браслет', 'jewelry', 'ring', 'necklace', 'bracelet'])) return 'jewelry'
    if (hasAny(haystack, ['ремін', 'belt'])) return 'belts'
    if (hasAny(haystack, ['гаман', 'wallet'])) return 'wallets'
    if (hasAny(haystack, ['кепк', 'бейсболк', 'cap'])) return 'caps-baseball-caps'
    if (hasAny(haystack, ['шапк', 'hat', 'beanie'])) return 'winter-hats'
    return DEFAULT_LEAF_BY_ROOT[rootSlug]
  }

  if (rootSlug === 'souvenirs') {
    if (hasAny(haystack, ['чашк', 'термочаш', 'mug', 'tumbler'])) return 'mugs-tumblers'
    if (hasAny(haystack, ['постер', 'poster', 'картин', 'print'])) return 'posters-art'
    if (hasAny(haystack, ['магніт', 'magnet', 'декор', 'figurine'])) return 'magnets-decor'
    if (hasAny(haystack, ['брелок', 'keychain'])) return 'keychains'
    if (hasAny(haystack, ['стікер', 'sticker', 'наліпк'])) return 'stickers'
    if (hasAny(haystack, ['значок', 'badge', 'pin'])) return 'pins-badges'
    return DEFAULT_LEAF_BY_ROOT[rootSlug]
  }

  if (rootSlug === 'stationery') {
    if (hasAny(haystack, ['ручк', 'олів', 'pen', 'pencil'])) return 'pens-pencils'
    if (hasAny(haystack, ['маркер', 'marker', 'highlight'])) return 'markers-highlighters'
    if (hasAny(haystack, ['зошит', 'notebook'])) return 'notebooks'
    if (hasAny(haystack, ['блокнот', 'notepad'])) return 'notepads'
    if (hasAny(haystack, ['щоден', 'planner', 'diary'])) return 'planners'
    if (hasAny(haystack, ['папк', 'folder', 'органайзер', 'organizer'])) return 'folders-organizers'
    if (hasAny(haystack, ['настільн', 'desk'])) return 'desk-accessories'
    return DEFAULT_LEAF_BY_ROOT[rootSlug]
  }

  return DEFAULT_LEAF_BY_ROOT[DEFAULT_ROOT_SLUG]
}

function classifyProduct(product) {
  const rootSlug = detectRootSlug(product)
  const leafSlug = detectLeafSlug(rootSlug, product)

  return {
    rootSlug,
    leafSlug,
    reason: leafSlug.startsWith('other-') ? 'fallback' : product.currentSlug ? 'legacy-category' : 'keyword',
  }
}

async function ensureMigrationLogTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS category_migration_logs (
      product_id UUID PRIMARY KEY,
      old_category_slug TEXT,
      new_category_slug TEXT NOT NULL,
      match_strategy TEXT NOT NULL,
      note TEXT,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `
}

async function fetchCategoryMap() {
  const rows = await sql`
    SELECT id, slug
    FROM categories
    WHERE level = 2
  `

  const categoryMap = new Map(rows.map((row) => [row.slug, row.id]))
  const missingSlugs = REQUIRED_LEAF_SLUGS.filter((slug) => !categoryMap.has(slug))

  if (missingSlugs.length > 0) {
    throw new Error(`Missing leaf categories for slugs: ${missingSlugs.join(', ')}`)
  }

  return categoryMap
}

async function fetchBatch() {
  return sql`
    SELECT
      p.id,
      p.name,
      p.sku,
      c.slug AS "currentSlug"
    FROM products AS p
    LEFT JOIN categories AS c
      ON c.id = p.category_id
    WHERE p.category_id IS NULL
       OR c.level != 2
    ORDER BY p.created_at ASC, p.id ASC
    LIMIT ${BATCH_SIZE}
  `
}

function buildAssignments(products, categoryMap) {
  return products.map((product) => {
    const match = classifyProduct(product)
    const categoryId = categoryMap.get(match.leafSlug)

    if (!categoryId) {
      throw new Error(`Leaf category slug "${match.leafSlug}" is not available in category map`)
    }

    return {
      productId: product.id,
      oldCategorySlug: product.currentSlug ?? null,
      categoryId,
      rootSlug: match.rootSlug,
      leafSlug: match.leafSlug,
      reason: match.reason,
    }
  })
}

function groupAssignments(assignments) {
  const groups = new Map()

  for (const assignment of assignments) {
    const key = `${assignment.reason}:${assignment.leafSlug}:${assignment.categoryId}`
    const current = groups.get(key) ?? {
      reason: assignment.reason,
      leafSlug: assignment.leafSlug,
      categoryId: assignment.categoryId,
      productIds: [],
    }

    current.productIds.push(assignment.productId)
    groups.set(key, current)
  }

  return [...groups.values()]
}

async function persistAssignmentLogs(tx, assignments) {
  for (const assignment of assignments) {
    await tx`
      INSERT INTO category_migration_logs (
        product_id,
        old_category_slug,
        new_category_slug,
        match_strategy,
        note,
        created_at,
        updated_at
      )
      VALUES (
        ${assignment.productId}::uuid,
        ${assignment.oldCategorySlug},
        ${assignment.leafSlug},
        ${assignment.reason},
        ${`Assigned to ${assignment.leafSlug} from ${assignment.oldCategorySlug ?? 'NULL'} via ${assignment.reason}`},
        NOW(),
        NOW()
      )
      ON CONFLICT (product_id) DO UPDATE
      SET
        old_category_slug = EXCLUDED.old_category_slug,
        new_category_slug = EXCLUDED.new_category_slug,
        match_strategy = EXCLUDED.match_strategy,
        note = EXCLUDED.note,
        updated_at = NOW()
    `
  }
}

async function applyGroupUpdate(tx, group, summary) {
  try {
    const updatedRows = await tx`
      UPDATE products
      SET category_id = ${group.categoryId}
      WHERE id IN ${tx(group.productIds)}
      RETURNING id
    `

    const updatedCount = updatedRows.length
    summary.updated += updatedCount
    summary[group.reason] += updatedCount

    console.log(
      `[backfill] ${group.reason.toUpperCase()} matched ${updatedCount} product(s) -> ${group.leafSlug}`,
    )
  } catch (error) {
    summary.errors += group.productIds.length
    console.error(
      `[backfill] Failed to update ${group.productIds.length} product(s) for ${group.leafSlug} via ${group.reason}:`,
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
    await persistAssignmentLogs(tx, assignments)

    for (const group of groups) {
      await applyGroupUpdate(tx, group, summary)
    }
  })

  const batchLegacy = assignments.filter((item) => item.reason === 'legacy-category').length
  const batchKeyword = assignments.filter((item) => item.reason === 'keyword').length
  const batchFallback = assignments.filter((item) => item.reason === 'fallback').length

  console.log(
    `[backfill] Batch ${batchNumber} summary: legacy=${batchLegacy}, keyword=${batchKeyword}, fallback=${batchFallback}`,
  )

  if (summary.updated === updatedBeforeBatch) {
    throw new Error(
      `[backfill] Batch ${batchNumber} completed without updates. Stopping to avoid retrying the same records indefinitely.`,
    )
  }

  return true
}

async function verifyNoUnassignedProducts() {
  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count
    FROM products AS p
    LEFT JOIN categories AS c ON c.id = p.category_id
    WHERE p.category_id IS NULL
       OR c.level != 2
  `

  if (count > 0) {
    throw new Error(`[backfill] ${count} product(s) still require a leaf category assignment`)
  }
}

async function main() {
  const summary = {
    updated: 0,
    'legacy-category': 0,
    keyword: 0,
    fallback: 0,
    errors: 0,
  }

  try {
    console.log(
      `[backfill] Starting category backfill with batch size ${BATCH_SIZE}. Default root: ${DEFAULT_ROOT_SLUG}`,
    )

    await ensureMigrationLogTable()
    const categoryMap = await fetchCategoryMap()
    let batchNumber = 1

    while (await processBatch(batchNumber, categoryMap, summary)) {
      batchNumber += 1
    }

    await verifyNoUnassignedProducts()

    console.log('[backfill] Completed category backfill')
    console.log(
      `[backfill] Summary: updated=${summary.updated}, legacyCategory=${summary['legacy-category']}, matchedByKeyword=${summary.keyword}, fallbackAssigned=${summary.fallback}, errors=${summary.errors}`,
    )
  } catch (error) {
    console.error('[backfill] Fatal error during category backfill:', error)
    process.exitCode = 1
  } finally {
    await sql.end({ timeout: 5 })
  }
}

void main()
