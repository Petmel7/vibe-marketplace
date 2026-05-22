import Link from 'next/link'
import { ArrowDownRight } from 'lucide-react'
import ProductCardGrid from '@/components/product/ProductCardGrid'
import { isRenderablePublicProduct } from '@/components/product/productListItem'
import { listHitProducts, listNewProducts } from '@/features/products/product.service'

interface Props {
  type: 'new' | 'hit'
  title: string
}

export default async function HomeProductSection({ type, title }: Props) {
  const result =
    type === 'new'
      ? await listNewProducts({ page: 1, limit: 4 })
      : await listHitProducts({ page: 1, limit: 4 })

  const visibleProducts = result.data.filter(isRenderablePublicProduct)

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="ui-heading-product mb-0">{title}</h2>
        <Link
          href={type === 'new' ? '/products/new' : '/products/hit'}
          className="flex items-center gap-1 text-sm text-copy-muted transition-colors hover:text-copy-primary"
        >
          <p>Переглянути усі</p>
          <ArrowDownRight />
        </Link>
      </div>

      {visibleProducts.length > 0 ? (
        <ProductCardGrid products={visibleProducts} />
      ) : (
        <p className="ui-body-muted">Товари поки що відсутні.</p>
      )}
    </section>
  )
}
