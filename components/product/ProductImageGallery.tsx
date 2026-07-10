'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import ProductGalleryThumbnail from './ProductGalleryThumbnail'
import type { ProductImageDto } from '@/features/products/product.dto'

const PRODUCT_IMAGE_FALLBACK = '/placeholder.png'

type GalleryImage = {
  alt: string
  id: string
  src: string
}

interface ProductImageGalleryProps {
  images: ProductImageDto[]
  productName: string
}

function sortGalleryImages(images: ProductImageDto[]): ProductImageDto[] {
  return [...images].sort((left, right) => {
    if (left.isPrimary !== right.isPrimary) {
      return left.isPrimary ? -1 : 1
    }

    if (left.position !== right.position) {
      return left.position - right.position
    }

    return left.id.localeCompare(right.id)
  })
}

export default function ProductImageGallery({
  images,
  productName,
}: ProductImageGalleryProps) {
  const galleryImages = useMemo<GalleryImage[]>(() => {
    const sortedImages = sortGalleryImages(images)

    if (sortedImages.length === 0) {
      return [
        {
          id: 'fallback-image',
          src: PRODUCT_IMAGE_FALLBACK,
          alt: productName,
        },
      ]
    }

    return sortedImages.map((image, index) => ({
      id: image.id,
      src: image.url,
      alt:
        image.altText?.trim() ||
        `${productName}${sortedImages.length > 1 ? ` — зображення ${index + 1}` : ''}`,
    }))
  }, [images, productName])

  const [brokenIds, setBrokenIds] = useState<Record<string, boolean>>({})
  const [selectedImageId, setSelectedImageId] = useState<string | null>(galleryImages[0]?.id ?? null)
  const hasMultipleImages = galleryImages.length > 1

  const selectedImage =
    galleryImages.find((image) => image.id === selectedImageId) ?? galleryImages[0]

  const selectedSrc = selectedImage && brokenIds[selectedImage.id]
    ? PRODUCT_IMAGE_FALLBACK
    : selectedImage?.src ?? PRODUCT_IMAGE_FALLBACK

  function resolveImageSrc(image: GalleryImage) {
    return brokenIds[image.id] ? PRODUCT_IMAGE_FALLBACK : image.src
  }

  function markBroken(id: string) {
    setBrokenIds((current) => (current[id] ? current : { ...current, [id]: true }))
  }

  return (
    <section className="space-y-4" aria-label="Галерея зображень товару">
      <div className={hasMultipleImages ? 'grid gap-4 lg:grid-cols-[88px_minmax(0,1fr)]' : 'grid gap-4'}>
        {hasMultipleImages ? (
          <div className="order-2 lg:order-1">
            <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:max-h-168 lg:auto-rows-max lg:overflow-y-auto lg:overflow-x-visible">
              {galleryImages.map((image, index) => (
                <ProductGalleryThumbnail
                  key={image.id}
                  src={resolveImageSrc(image)}
                  alt={`Обрати зображення ${index + 1} для товару ${productName}`}
                  isSelected={image.id === selectedImage.id}
                  onSelect={() => setSelectedImageId(image.id)}
                  onError={() => markBroken(image.id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className={hasMultipleImages ? 'order-1 lg:order-2' : 'order-1'}>
          <div className="relative aspect-square w-full overflow-hidden rounded-[28px] border border-panelBorder bg-panel shadow-sm">
            <Image
              key={selectedImage.id}
              src={selectedSrc}
              alt={selectedImage.alt}
              fill
              priority
              sizes="(min-width: 1280px) 42vw, (min-width: 768px) 48vw, 100vw"
              className="object-contain p-4 sm:p-6"
              onError={() => markBroken(selectedImage.id)}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
