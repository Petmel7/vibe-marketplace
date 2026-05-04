import "dotenv/config";
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

const CATALOG_TREE = [
  {
    id: 'cat-root-clothing-shoes',
    name: 'Одяг та взуття',
    slug: 'clothing-shoes',
    order: 0,
    children: [
      {
        id: 'cat-parent-womens-clothing',
        name: 'Жіночий одяг',
        slug: 'womens-clothing',
        order: 0,
        children: [
          { id: 'cat-leaf-womens-dresses', name: 'Жіночі сукні', slug: 'womens-dresses', order: 0 },
          { id: 'cat-leaf-womens-outerwear', name: 'Жіночий верхній одяг', slug: 'womens-outerwear', order: 1 },
          { id: 'cat-leaf-womens-tops', name: 'Жіночі футболки та топи', slug: 'womens-tops', order: 2 },
          { id: 'cat-leaf-womens-bottoms', name: 'Жіночі штани та спідниці', slug: 'womens-bottoms', order: 3 },
          { id: 'cat-leaf-other-womens-clothing', name: 'Інший жіночий одяг', slug: 'other-womens-clothing', order: 4 },
        ],
      },
      {
        id: 'cat-parent-mens-clothing',
        name: 'Чоловічий одяг',
        slug: 'mens-clothing',
        order: 1,
        children: [
          { id: 'cat-leaf-mens-tops', name: 'Чоловічі футболки та сорочки', slug: 'mens-tops', order: 0 },
          { id: 'cat-leaf-mens-hoodies-sweatshirts', name: 'Чоловічі худі та світшоти', slug: 'mens-hoodies-sweatshirts', order: 1 },
          { id: 'cat-leaf-mens-pants', name: 'Чоловічі штани', slug: 'mens-pants', order: 2 },
          { id: 'cat-leaf-mens-outerwear', name: 'Чоловічий верхній одяг', slug: 'mens-outerwear', order: 3 },
          { id: 'cat-leaf-other-mens-clothing', name: 'Інший чоловічий одяг', slug: 'other-mens-clothing', order: 4 },
        ],
      },
      {
        id: 'cat-parent-kids-clothing',
        name: 'Дитячий одяг',
        slug: 'kids-clothing',
        order: 2,
        children: [
          { id: 'cat-leaf-girls-clothing', name: 'Одяг для дівчат', slug: 'girls-clothing', order: 0 },
          { id: 'cat-leaf-boys-clothing', name: 'Одяг для хлопців', slug: 'boys-clothing', order: 1 },
          { id: 'cat-leaf-baby-clothing', name: 'Одяг для немовлят', slug: 'baby-clothing', order: 2 },
          { id: 'cat-leaf-other-kids-clothing', name: 'Інший дитячий одяг', slug: 'other-kids-clothing', order: 3 },
        ],
      },
      {
        id: 'cat-parent-footwear',
        name: 'Взуття',
        slug: 'footwear',
        order: 3,
        children: [
          { id: 'cat-leaf-womens-shoes', name: 'Жіноче взуття', slug: 'womens-shoes', order: 0 },
          { id: 'cat-leaf-mens-shoes', name: 'Чоловіче взуття', slug: 'mens-shoes', order: 1 },
          { id: 'cat-leaf-kids-shoes', name: 'Дитяче взуття', slug: 'kids-shoes', order: 2 },
          { id: 'cat-leaf-other-footwear', name: 'Інше взуття', slug: 'other-footwear', order: 3 },
        ],
      },
      {
        id: 'cat-parent-unisex-clothing',
        name: 'Унісекс одяг',
        slug: 'unisex-clothing',
        order: 4,
        children: [
          { id: 'cat-leaf-other-unisex-clothing', name: 'Інший унісекс одяг', slug: 'other-unisex-clothing', order: 0 },
        ],
      },
    ],
  },
  {
    id: 'cat-root-accessories',
    name: 'Аксесуари',
    slug: 'accessories',
    order: 1,
    children: [
      {
        id: 'cat-parent-bags-backpacks',
        name: 'Сумки та рюкзаки',
        slug: 'bags-backpacks',
        order: 0,
        children: [
          { id: 'cat-leaf-womens-bags', name: 'Жіночі сумки', slug: 'womens-bags', order: 0 },
          { id: 'cat-leaf-mens-bags', name: 'Чоловічі сумки', slug: 'mens-bags', order: 1 },
          { id: 'cat-leaf-backpacks', name: 'Рюкзаки', slug: 'backpacks', order: 2 },
          { id: 'cat-leaf-other-bags', name: 'Інші сумки', slug: 'other-bags', order: 3 },
        ],
      },
      {
        id: 'cat-parent-jewelry-watches',
        name: 'Прикраси та годинники',
        slug: 'jewelry-watches',
        order: 1,
        children: [
          { id: 'cat-leaf-jewelry', name: 'Прикраси', slug: 'jewelry', order: 0 },
          { id: 'cat-leaf-watches', name: 'Годинники', slug: 'watches', order: 1 },
          { id: 'cat-leaf-other-jewelry-watches', name: 'Інші прикраси та годинники', slug: 'other-jewelry-watches', order: 2 },
        ],
      },
      {
        id: 'cat-parent-belts-wallets',
        name: 'Ремені та гаманці',
        slug: 'belts-wallets',
        order: 2,
        children: [
          { id: 'cat-leaf-belts', name: 'Ремені', slug: 'belts', order: 0 },
          { id: 'cat-leaf-wallets', name: 'Гаманці', slug: 'wallets', order: 1 },
          { id: 'cat-leaf-other-wear-accessories', name: 'Інші аксесуари для носіння', slug: 'other-wear-accessories', order: 2 },
        ],
      },
      {
        id: 'cat-parent-headwear',
        name: 'Головні убори',
        slug: 'headwear',
        order: 3,
        children: [
          { id: 'cat-leaf-caps-baseball-caps', name: 'Кепки та бейсболки', slug: 'caps-baseball-caps', order: 0 },
          { id: 'cat-leaf-winter-hats', name: 'Шапки', slug: 'winter-hats', order: 1 },
          { id: 'cat-leaf-other-headwear', name: 'Інші головні убори', slug: 'other-headwear', order: 2 },
        ],
      },
    ],
  },
  {
    id: 'cat-root-souvenirs',
    name: 'Сувеніри',
    slug: 'souvenirs',
    order: 2,
    children: [
      {
        id: 'cat-parent-home-decor-souvenirs',
        name: 'Посуд та декор',
        slug: 'home-decor-souvenirs',
        order: 0,
        children: [
          { id: 'cat-leaf-mugs-tumblers', name: 'Чашки та термочашки', slug: 'mugs-tumblers', order: 0 },
          { id: 'cat-leaf-posters-art', name: 'Постери та картини', slug: 'posters-art', order: 1 },
          { id: 'cat-leaf-magnets-decor', name: 'Магніти та декор', slug: 'magnets-decor', order: 2 },
          { id: 'cat-leaf-other-home-decor-souvenirs', name: 'Інший декор', slug: 'other-home-decor-souvenirs', order: 3 },
        ],
      },
      {
        id: 'cat-parent-gift-souvenirs',
        name: 'Памʼятні дрібниці',
        slug: 'gift-souvenirs',
        order: 1,
        children: [
          { id: 'cat-leaf-keychains', name: 'Брелоки', slug: 'keychains', order: 0 },
          { id: 'cat-leaf-stickers', name: 'Наліпки', slug: 'stickers', order: 1 },
          { id: 'cat-leaf-pins-badges', name: 'Значки', slug: 'pins-badges', order: 2 },
          { id: 'cat-leaf-other-gift-souvenirs', name: 'Інші сувеніри', slug: 'other-gift-souvenirs', order: 3 },
        ],
      },
    ],
  },
  {
    id: 'cat-root-stationery',
    name: 'Канцелярія',
    slug: 'stationery',
    order: 3,
    children: [
      {
        id: 'cat-parent-writing-supplies',
        name: 'Для письма',
        slug: 'writing-supplies',
        order: 0,
        children: [
          { id: 'cat-leaf-pens-pencils', name: 'Ручки та олівці', slug: 'pens-pencils', order: 0 },
          { id: 'cat-leaf-markers-highlighters', name: 'Маркери', slug: 'markers-highlighters', order: 1 },
          { id: 'cat-leaf-other-writing-supplies', name: 'Інше для письма', slug: 'other-writing-supplies', order: 2 },
        ],
      },
      {
        id: 'cat-parent-paper-goods',
        name: 'Паперові товари',
        slug: 'paper-goods',
        order: 1,
        children: [
          { id: 'cat-leaf-notebooks', name: 'Зошити', slug: 'notebooks', order: 0 },
          { id: 'cat-leaf-notepads', name: 'Блокноти', slug: 'notepads', order: 1 },
          { id: 'cat-leaf-planners', name: 'Щоденники', slug: 'planners', order: 2 },
          { id: 'cat-leaf-other-paper-goods', name: 'Інші паперові товари', slug: 'other-paper-goods', order: 3 },
        ],
      },
      {
        id: 'cat-parent-office-supplies',
        name: 'Офісні товари',
        slug: 'office-supplies',
        order: 2,
        children: [
          { id: 'cat-leaf-folders-organizers', name: 'Папки та органайзери', slug: 'folders-organizers', order: 0 },
          { id: 'cat-leaf-desk-accessories', name: 'Настільні аксесуари', slug: 'desk-accessories', order: 1 },
          { id: 'cat-leaf-other-office-supplies', name: 'Інша канцелярія', slug: 'other-office-supplies', order: 2 },
        ],
      },
    ],
  },
]

function flattenCatalog(nodes, parentSlug = null, level = 0) {
  return nodes.flatMap((node) => {
    const current = {
      id: node.id,
      name: node.name,
      slug: node.slug,
      parentSlug,
      level,
      order: node.order,
      image: null,
      icon: null,
      hoverImage: null,
      isActive: true,
      isVisible: true,
    }

    const children = node.children ? flattenCatalog(node.children, node.slug, level + 1) : []
    return [current, ...children]
  })
}

const categories = flattenCatalog(CATALOG_TREE)

async function seedCategories() {
  await sql.begin(async (tx) => {
    for (const category of categories) {
      const parentId = category.parentSlug
        ? (await tx`
            SELECT id
            FROM categories
            WHERE slug = ${category.parentSlug}
            LIMIT 1
          `)[0]?.id ?? null
        : null

      if (category.parentSlug && !parentId) {
        throw new Error(`Parent category "${category.parentSlug}" not found for "${category.slug}"`)
      }

      await tx`
        INSERT INTO categories (
          id,
          parent_id,
          name,
          slug,
          image_url,
          icon,
          hover_image,
          sort_order,
          level,
          is_active,
          is_visible,
          created_at,
          updated_at
        )
        VALUES (
          ${category.id},
          ${parentId},
          ${category.name},
          ${category.slug},
          ${category.image},
          ${category.icon},
          ${category.hoverImage},
          ${category.order},
          ${category.level},
          ${category.isActive},
          ${category.isVisible},
          NOW(),
          NOW()
        )
        ON CONFLICT (slug) DO UPDATE
        SET
          parent_id = EXCLUDED.parent_id,
          name = EXCLUDED.name,
          image_url = EXCLUDED.image_url,
          icon = EXCLUDED.icon,
          hover_image = EXCLUDED.hover_image,
          sort_order = EXCLUDED.sort_order,
          level = EXCLUDED.level,
          is_active = EXCLUDED.is_active,
          is_visible = EXCLUDED.is_visible,
          updated_at = NOW()
      `
    }
  })
}

async function main() {
  try {
    console.log('[seed] Seeding hierarchical categories...')
    await seedCategories()
    console.log(`[seed] Upserted ${categories.length} hierarchical categories`)
  } catch (error) {
    console.error('[seed] Failed to seed categories:', error)
    process.exitCode = 1
  } finally {
    await sql.end({ timeout: 5 })
  }
}

void main()
