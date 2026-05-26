import { notFound } from 'next/navigation'
import { getProduct, ProductNotFoundError } from '@/features/products/product.service'
import type { ProductDetailDto } from '@/features/products/product.dto'
import ProductDetails from '@/components/product/ProductDetails'
import ProductDetailsShell from '@/components/product/ProductDetailsShell'
import ProductImageGallery from '@/components/product/ProductImageGallery'
import RecentlyViewed from '@/components/viewed/RecentlyViewed'
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

  const breadcrumbItems = [
    {
      label: 'Головна',
      href: '/',
    },
    {
      label: 'Каталог',
      href: '/catalog',
    },
    ...(product.categoryName && product.categorySlug
      ? [
        {
          label: product.categoryName,
          href: `/products/category/${product.categorySlug}`,
        },
      ]
      : []),
    {
      label: product.name,
    },
  ]

  return (
    <>
      <div className="space-y-8 pb-8 md:space-y-10">
        <Breadcrumbs items={breadcrumbItems} />

        <ProductDetailsShell
          gallery={<ProductImageGallery images={product.images} productName={product.name} />}
          purchasePanel={<ProductDetails product={product} />}
        />
      </div>

      <RecentlyViewed currentProductId={id} />
    </>
  )
}
