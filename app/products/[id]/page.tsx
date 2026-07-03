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
import { SeoEntityNotFoundError } from '@/lib/errors/seo'
import { getCachedProductSeo } from '@/app/_lib/seo.data'
import { buildProductMetadata } from '@/lib/seo/metadata'
import ProductJsonLd from '@/components/seo/ProductJsonLd'
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd'
import {
  buildBreadcrumbJsonLd,
  buildCanonicalUrl,
  buildProductJsonLd,
} from '@/features/seo/seo.helpers'

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

function buildProductBreadcrumbItems(product: ProductDetailDto) {
  return [
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
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params

  let product: ProductDetailDto

  try {
    product = await getProduct(id)
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      notFound()
    }

    throw error
  }

  const reviews = await listReviews(id, { page: 1, limit: 10 })
  const canonicalUrl = buildCanonicalUrl(`/products/${product.id}`)
  const breadcrumbItems = buildProductBreadcrumbItems(product)
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Головна', item: buildCanonicalUrl('/') },
    { name: 'Каталог', item: buildCanonicalUrl('/catalog') },
    ...(product.categoryName && product.categorySlug
      ? [
          {
            name: product.categoryName,
            item: buildCanonicalUrl(`/products/category/${product.categorySlug}`),
          },
        ]
      : []),
    {
      name: product.name,
      item: canonicalUrl,
    },
  ])

  const productJsonLd = buildProductJsonLd({
    name: product.name,
    description:
      product.description?.trim() ||
      `${product.name}. Ціна, відгуки та доставка по Україні.`,
    imageUrls:
      product.images.length > 0
        ? product.images.map((image) => image.url)
        : product.imageUrl
          ? [product.imageUrl]
          : [],
    sku: product.sku,
    category: product.categoryName,
    storeName: product.storeName,
    url: canonicalUrl,
    price: product.price,
    inStock: product.inStock,
  })

  return (
    <>
      <ProductJsonLd
        data={productJsonLd}
        ratingSummary={product.ratingSummary}
        reviews={reviews.items}
      />
      <BreadcrumbJsonLd data={breadcrumbJsonLd} />
      <div className="space-y-8 pb-8 md:space-y-10">
        <Breadcrumbs items={breadcrumbItems} />

        <ProductDetailsShell
          gallery={<ProductImageGallery images={product.images} productName={product.name} />}
          purchasePanel={<ProductDetails product={product} />}
        />

        <ProductReviewsSection
          productId={product.id}
          productName={product.name}
          ratingSummary={product.ratingSummary}
          reviews={reviews}
        />
      </div>

      <RecentlyViewed currentProductId={id} />
    </>
  )
}
