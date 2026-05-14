import { notFound } from 'next/navigation'
import { getProduct, ProductNotFoundError } from '@/features/products/product.service'
import type { ProductDetailDto } from '@/features/products/product.dto'
import ProductImageSlider from '@/components/product/ProductImageSlider'
import ProductDetails from '@/components/product/ProductDetails'
import RecentlyViewed from '@/components/viewed/RecentlyViewed'
import { PageContainer } from '@/components/layout/PageContainer'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params

  let product: ProductDetailDto

  try {
    product = await getProduct(id)
  } catch (e) {
    if (e instanceof ProductNotFoundError) notFound()
    throw e
  }

  const images = product.imageUrl ? [product.imageUrl] : []

  return (
    <PageContainer>
      <Breadcrumbs
        items={[
          {
            label: 'Головна',
            href: '/',
          },
          {
            label: 'Каталог',
            href: '/catalog',
          },
          {
            label: `${product.name}`,
          },
        ]}
      />

      {/* Two-column on desktop, stacked on mobile */}
      <div className="flex flex-col md:flex-row md:gap-8 md:items-start">
        {/* Left: image */}
        <div className="w-full md:w-108 shrink-0">
          <ProductImageSlider images={images} alt={product.name} />
        </div>
        {/* Right: details */}
        <div className="flex-1 mt-6 md:mt-0 min-w-0">
          <ProductDetails product={product} />
        </div>
      </div>

      <RecentlyViewed currentProductId={id} />
    </PageContainer>
  )
}
