import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProduct, ProductNotFoundError } from '@/features/products/product.service'
import type { ProductDetailDto } from '@/features/products/product.dto'
import ProductDetails from '@/components/product/ProductDetails'
import ProductDetailsShell from '@/components/product/ProductDetailsShell'
import ProductImageGallery from '@/components/product/ProductImageGallery'
import ProductReviewsSection from '@/components/reviews/ProductReviewsSection'
import RecentlyViewed from '@/components/viewed/RecentlyViewed'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { listReviews } from '@/features/review/review.service'
import { getCurrentUser } from '@/lib/session/getSession'
import { SeoEntityNotFoundError } from '@/lib/errors/seo'
import { getCachedProductSeo } from '@/app/_lib/seo.data'
import { buildProductMetadata } from '@/lib/seo/metadata'
import ProductJsonLd from '@/components/seo/ProductJsonLd'
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params

  try {
    const seo = await getCachedProductSeo(id)
    return buildProductMetadata(seo)
  } catch (error) {
    if (error instanceof SeoEntityNotFoundError) {
      notFound()
    }

    throw error
  }
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params

  let product: ProductDetailDto
  let seo: Awaited<ReturnType<typeof getCachedProductSeo>>

  try {
    ;[product, seo] = await Promise.all([
      getProduct(id),
      getCachedProductSeo(id),
    ])
  } catch (e) {
    if (e instanceof ProductNotFoundError || e instanceof SeoEntityNotFoundError) notFound()
    throw e
  }

  const [reviews, currentUser] = await Promise.all([
    listReviews(id, { page: 1, limit: 10 }),
    getCurrentUser(),
  ])

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
      <ProductJsonLd
        data={seo.productJsonLd}
        ratingSummary={product.ratingSummary}
        reviews={reviews.items}
      />
      <BreadcrumbJsonLd data={seo.breadcrumbJsonLd} />
      <div className="space-y-8 pb-8 md:space-y-10">
        <Breadcrumbs items={breadcrumbItems} />

        <ProductDetailsShell
          gallery={<ProductImageGallery images={product.images} productName={product.name} />}
          purchasePanel={<ProductDetails product={product} currentUser={currentUser} />}
        />

        <ProductReviewsSection
          productId={product.id}
          productName={product.name}
          ratingSummary={product.ratingSummary}
          reviews={reviews}
          currentUser={currentUser}
        />
      </div>

      <RecentlyViewed currentProductId={id} />
    </>
  )
}
