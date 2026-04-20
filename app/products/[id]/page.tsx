import { notFound } from 'next/navigation'
import { getProduct, ProductNotFoundError } from '@/features/products/product.service'
import type { ProductDetailDto } from '@/features/products/product.dto'
import ProductImageSlider from '@/components/product/ProductImageSlider'
import ProductDetails from '@/components/product/ProductDetails'
import RecentlyViewed from '@/components/product/RecentlyViewed'
import Link from 'next/link'

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
    <div className="max-w-240 mx-auto px-4 py-6">
      {/* Breadcrumbs */}
      <nav aria-label="Хлібні крихти" className="flex items-center gap-1 text-[12px] text-[#A5A8AD] mb-6">
        <Link href="/" className="hover:text-[#F1F3F5] transition-colors">Головна</Link>
        <span aria-hidden="true">/</span>
        <Link href="/" className="hover:text-[#F1F3F5] transition-colors">Каталог</Link>
        <span aria-hidden="true">/</span>
        <span className="text-[#F1F3F5] truncate max-w-50">{product.name}</span>
      </nav>

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
    </div>
  )
}
