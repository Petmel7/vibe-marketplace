import ProductCard from '@/components/product/ProductCard'
import type { ProductListItem } from '@/components/product/productListItem'
import { toProductCardProps } from '@/components/product/productListItem'

export type ProductCardGridVariant = 'catalog' | 'section'

const gridClassByVariant: Record<ProductCardGridVariant, string> = {
  catalog: 'grid grid-cols-1 gap-4 min-[375px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
  section: 'grid grid-cols-1 gap-4 min-[375px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
}

interface Props {
  products: ProductListItem[]
  variant?: ProductCardGridVariant
}

export default function ProductCardGrid({ products, variant = 'section' }: Props) {
  return (
    <div className={gridClassByVariant[variant]}>
      {products.map((product) => (
        <ProductCard key={product.id} {...toProductCardProps(product)} />
      ))}
    </div>
  )
}
