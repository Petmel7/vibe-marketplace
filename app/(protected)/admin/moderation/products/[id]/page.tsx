import Link from 'next/link'
import { notFound } from 'next/navigation'
import AdminProductModerationDetail from '@/components/admin/AdminProductModerationDetail'
import AdminSection from '@/components/admin/AdminSection'
import { getProductModerationDetail } from '@/features/moderation/product/product-moderation.service'
import { ProductNotFoundError } from '@/lib/errors/seller'
import { getCurrentUser } from '@/lib/session/getSession'

export default async function AdminModerationProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const { id } = await params

  let product
  try {
    product = await getProductModerationDetail(user, id)
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      notFound()
    }

    throw error
  }

  return (
    <AdminSection
      eyebrow="Модерація товару"
      title={product.name}
      description="Перегляньте повний контекст товару перед адміністративним рішенням."
    >
      <Link href="/admin/moderation" className="ui-link-muted">
        Назад до черги модерації
      </Link>

      <AdminProductModerationDetail product={product} />
    </AdminSection>
  )
}
