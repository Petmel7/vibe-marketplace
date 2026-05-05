import Image from 'next/image'
import Link from 'next/link'
import type { CategoryListItem } from '@/components/category/category.data'
import { getCategoryImage } from '@/components/category/category.data'

interface Props {
  categories: CategoryListItem[]
  maxItems?: number
  layout?: 'homepage' | 'grid'
}

function CategoryCard({ category }: { category: CategoryListItem }) {
  return (
    <Link
      href={`/products/category/${category.slug}`}
      className="relative block aspect-square overflow-hidden rounded-tl-[18px] rounded-br-[18px]"
    >
      <Image
        src={getCategoryImage(category.slug, category.imageUrl)}
        alt={category.name}
        fill
        className="object-cover"
        sizes="(max-width: 767px) 357px, 25vw"
      />
      <span className="absolute top-0 left-0 flex items-center justify-center bg-[#565C66] w-32.5 h-10 text-[16px] font-normal text-copy-primary rounded-tl-[18px] rounded-br-[18px]">
        <span className="truncate px-2">{category.name}</span>
      </span>
    </Link>
  )
}

export default function CategoryCards({
  categories,
  maxItems,
  layout = 'homepage',
}: Props) {
  const items = maxItems ? categories.slice(0, maxItems) : categories

  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="ui-scroll-row-snap md:hidden">
        {items.map((category) => (
          <div key={category.id} className="w-[min(85vw,357px)] shrink-0 snap-start">
            <CategoryCard category={category} />
          </div>
        ))}
      </div>

      <div className="hidden grid-cols-4 gap-4 md:grid">
        {items.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </>
  )
}
