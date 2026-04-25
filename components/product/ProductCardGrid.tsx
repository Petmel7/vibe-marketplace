import ProductCard from '@/components/product/ProductCard'
import type { ProductListItem } from '@/components/product/productListItem'
import { toProductCardProps } from '@/components/product/productListItem'

interface Props {
  products: ProductListItem[]
}

export default function ProductCardGrid({ products }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[375px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} {...toProductCardProps(product)} />
      ))}
    </div>
  )
}
