import postgres from 'postgres'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const sql = postgres(databaseUrl, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
})

const categories = [
  { id: 'catclothes0000000000000001', name: 'Одяг', slug: 'clothes', imageUrl: null },
  { id: 'cataccessories000000000002', name: 'Аксесуари', slug: 'accessories', imageUrl: null },
  { id: 'catsouvenirs00000000000003', name: 'Сувеніри', slug: 'souvenirs', imageUrl: null },
  { id: 'catstationery0000000000004', name: 'Канцелярія', slug: 'stationery', imageUrl: null },
]

async function seedCategories() {
  for (const category of categories) {
    await sql`
      INSERT INTO categories (id, name, slug, image_url, created_at, updated_at)
      VALUES (
        ${category.id},
        ${category.name},
        ${category.slug},
        ${category.imageUrl},
        NOW(),
        NOW()
      )
      ON CONFLICT (slug) DO UPDATE
      SET
        name = EXCLUDED.name,
        image_url = EXCLUDED.image_url,
        updated_at = NOW()
    `
  }
}

async function main() {
  try {
    console.log('[seed] Seeding base categories...')
    await seedCategories()
    console.log(`[seed] Upserted ${categories.length} categories`)
  } catch (error) {
    console.error('[seed] Failed to seed categories:', error)
    process.exitCode = 1
  } finally {
    await sql.end({ timeout: 5 })
  }
}

void main()
