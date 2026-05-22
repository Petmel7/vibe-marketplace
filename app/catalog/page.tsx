import ProductCardGrid from '@/components/product/ProductCardGrid'
import { isRenderablePublicProduct } from '@/components/product/productListItem'
import { listProducts } from '@/features/products/product.service'

export default async function Catalog() {
  const result = await listProducts({
    sort: 'newest',
    page: 1,
    limit: 12,
  })

  const visibleProducts = result.items.filter(isRenderablePublicProduct)

  if (visibleProducts.length === 0) {
    return <p className="ui-body-muted">РўРѕРІР°СЂРё РїРѕРєРё С‰Рѕ РІС–РґСЃСѓС‚РЅС–.</p>
  }

  return <ProductCardGrid products={visibleProducts} />
}
