import Link from 'next/link'
import ProductCardGrid from '@/components/product/ProductCardGrid'
import { listHitProducts, listNewProducts } from '@/features/products/product.service'
import { ArrowDownRight } from 'lucide-react';

interface Props {
  type: 'new' | 'hit'
  title: string
}

export default async function HomeProductSection({ type, title }: Props) {
  const result =
    type === 'new'
      ? await listNewProducts({ page: 1, limit: 4 })
      : await listHitProducts({ page: 1, limit: 4 })

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="ui-heading-product mb-0">{title}</h2>
        <Link href={type === 'new' ? '/products/new' : '/products/hit'} className="flex items-center gap-1 text-copy-muted hover:text-copy-primary transition-colors text-sm">
          <p>Дивитися все</p>
          <ArrowDownRight />
        </Link>
      </div>

      {result.data.length > 0 ? (
        <ProductCardGrid products={result.data} badgeVariant={type} />
      ) : (
        <p className="ui-body-muted">Товари поки що відсутні.</p>
      )}
    </section>
  )
}
