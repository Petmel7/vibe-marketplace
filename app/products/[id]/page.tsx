import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProductDetails from '@/components/product/ProductDetails'
import ProductDetailsShell from '@/components/product/ProductDetailsShell'
import ProductImageGallery from '@/components/product/ProductImageGallery'
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd'
import ProductJsonLd from '@/components/seo/ProductJsonLd'
import ProductReviewsSectionFallback from '@/components/reviews/ProductReviewsSectionFallback'
import ProductReviewsServerSection from '@/components/reviews/ProductReviewsServerSection'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import RecentlyViewed from '@/components/viewed/RecentlyViewed'
import { getCachedProductSeo } from '@/app/_lib/seo.data'
import type { ProductDetailDto } from '@/features/products/product.dto'
import { getProduct, ProductNotFoundError } from '@/features/products/product.service'
import {
  buildBreadcrumbJsonLd,
  buildCanonicalUrl,
  buildProductJsonLd,
} from '@/features/seo/seo.helpers'
import { SeoEntityNotFoundError } from '@/lib/errors/seo'
import { measureServerOperation } from '@/lib/observability/server-timing'
import { buildProductMetadata } from '@/lib/seo/metadata'

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
    product = await measureServerOperation(
      'product-page-product-detail',
      {
        route: '/products/[id]',
        component: 'app/products/[id]/page',
        service: 'getProduct',
        productId: id,
      },
      () => getProduct(id),
    )
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      notFound()
    }

    throw error
  }

  const {
    breadcrumbItems,
    breadcrumbJsonLd,
    productJsonLd,
  } = await measureServerOperation(
    'product-page-structured-data',
    {
      route: '/products/[id]',
      component: 'app/products/[id]/page',
      seo: 'jsonld-breadcrumb',
      productId: product.id,
    },
    async () => {
      const resolvedCanonicalUrl = buildCanonicalUrl(`/products/${product.id}`)
      const resolvedBreadcrumbItems = buildProductBreadcrumbItems(product)
      const resolvedBreadcrumbJsonLd = buildBreadcrumbJsonLd([
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
          item: resolvedCanonicalUrl,
        },
      ])

      const resolvedProductJsonLd = buildProductJsonLd({
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
        url: resolvedCanonicalUrl,
        price: product.price,
        inStock: product.inStock,
      })

        return {
          breadcrumbItems: resolvedBreadcrumbItems,
          breadcrumbJsonLd: resolvedBreadcrumbJsonLd,
          productJsonLd: resolvedProductJsonLd,
        }
      },
  )

  return (
    <>
      <ProductJsonLd data={productJsonLd} ratingSummary={product.ratingSummary} />
      <BreadcrumbJsonLd data={breadcrumbJsonLd} />
      <div className="space-y-8 pb-8 md:space-y-10">
        <Breadcrumbs items={breadcrumbItems} />

        <ProductDetailsShell
          gallery={<ProductImageGallery images={product.images} productName={product.name} />}
          purchasePanel={<ProductDetails product={product} />}
        />

        <Suspense fallback={<ProductReviewsSectionFallback summary={product.ratingSummary} />}>
          <ProductReviewsServerSection
            productId={product.id}
            productName={product.name}
            ratingSummary={product.ratingSummary}
          />
        </Suspense>
      </div>

      <RecentlyViewed currentProductId={id} />
    </>
  )
}
