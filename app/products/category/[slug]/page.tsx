import { notFound, permanentRedirect } from 'next/navigation'
import { getSafePublicCategoryCatalogPathByLegacySlug } from '@/features/categories/category.service'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function CategoryProductsRedirectPage({ params }: Props) {
  const { slug } = await params
  const categoryCatalogPath = await getSafePublicCategoryCatalogPathByLegacySlug(slug)

  if (!categoryCatalogPath) {
    notFound()
  }

  permanentRedirect(categoryCatalogPath.href)
}
