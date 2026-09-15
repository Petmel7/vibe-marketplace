import type { ReactNode } from 'react'
import Image from 'next/image'
import AdminProductModerationActions from '@/components/admin/AdminProductModerationActions'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import DetailPanel from '@/components/ui/panel/DetailPanel'
import {
  DataTable,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableMoneyCell,
  TableRow,
} from '@/components/ui/table'
import type { ProductModerationDetailDto } from '@/features/moderation/product/product-moderation.dto'
import { formatPrice } from '@/utils/formatters/price'
import { getAdminProductStatusLabel, getAdminProductStatusTone } from '@/types/admin'

const IMAGE_FALLBACK = '/placeholder.png'

function formatDate(value: Date | null) {
  return value ? new Date(value).toLocaleDateString('uk-UA') : '—'
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-copy-muted">{label}</dt>
      <dd className="mt-1 text-sm text-copy-strong">{value || '—'}</dd>
    </div>
  )
}

export default function AdminProductModerationDetail({
  product,
}: {
  product: ProductModerationDetailDto
}) {
  const galleryImages =
    product.images.length > 0
      ? product.images
      : [
          {
            id: 'fallback',
            url: product.imageUrl ?? IMAGE_FALLBACK,
            altText: product.name,
            isPrimary: true,
            position: 0,
          },
        ]

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <DetailPanel
          title="Візуальний огляд"
          description="Зображення, які продавець додав до товару для модерації."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {galleryImages.map((image, index) => (
              <div
                key={image.id}
                className="relative aspect-square overflow-hidden rounded-2xl border border-panelBorder bg-panel"
              >
                <Image
                  src={image.url}
                  alt={image.altText?.trim() || `${product.name} — зображення ${index + 1}`}
                  fill
                  sizes="(min-width: 1280px) 34vw, (min-width: 768px) 42vw, 100vw"
                  className="object-contain p-4"
                />
                {image.isPrimary ? (
                  <span className="absolute left-3 top-3 rounded-full bg-panel-strong px-3 py-1 text-xs font-semibold text-copy-strong shadow-sm">
                    Основне
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </DetailPanel>

        <DetailPanel
          title="Модерація"
          description="Поточний стан товару та доступні адміністративні дії."
          actions={
            <AdminStatusBadge
              label={getAdminProductStatusLabel(product.status)}
              tone={getAdminProductStatusTone(product.status)}
            />
          }
        >
          <div className="space-y-5">
            <dl className="grid gap-3">
              <DetailItem label="Створено" value={formatDate(product.createdAt)} />
              <DetailItem label="Оновлено" value={formatDate(product.updatedAt)} />
              <DetailItem label="Опубліковано" value={formatDate(product.publishedAt)} />
              <DetailItem label="Модеровано" value={formatDate(product.moderatedAt)} />
            </dl>

            {product.moderationReason || product.rejectionReason ? (
              <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-copy-muted">
                  Коментар модерації
                </p>
                <p className="mt-2 text-sm text-copy-secondary">
                  {product.moderationReason || product.rejectionReason}
                </p>
              </div>
            ) : null}

            <AdminProductModerationActions productId={product.id} status={product.status} />
          </div>
        </DetailPanel>
      </div>

      <DetailPanel title="Інформація про товар">
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-semibold text-copy-strong">{product.name}</h2>
            <p className="mt-2 text-lg font-semibold text-copy-primary">{formatPrice(product.price)}</p>
          </div>

          {product.description ? (
            <p className="whitespace-pre-line text-sm leading-6 text-copy-secondary">
              {product.description}
            </p>
          ) : (
            <p className="text-sm text-copy-muted">Опис товару не додано.</p>
          )}

          <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <DetailItem label="Категорія" value={product.categoryName} />
            <DetailItem label="Базовий SKU" value={product.sku} />
            <DetailItem label="ID товару" value={product.id} />
          </dl>
        </div>
      </DetailPanel>

      <DetailPanel
        title="Варіанти та залишки"
        description="Розміри, кольори, SKU, ціни та залишки, подані продавцем."
      >
        {product.variants.length === 0 ? (
          <p className="text-sm text-copy-muted">Варіанти товару не додано.</p>
        ) : (
          <DataTable>
            <TableHead>
              <tr>
                <TableHeaderCell>SKU</TableHeaderCell>
                <TableHeaderCell>Розмір</TableHeaderCell>
                <TableHeaderCell>Колір</TableHeaderCell>
                <TableHeaderCell>Ціна</TableHeaderCell>
                <TableHeaderCell>Залишок</TableHeaderCell>
              </tr>
            </TableHead>
            <tbody>
              {product.variants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell tone="secondary">{variant.sku}</TableCell>
                  <TableCell tone="secondary">{variant.size ?? '—'}</TableCell>
                  <TableCell tone="secondary">{variant.color ?? '—'}</TableCell>
                  <TableMoneyCell amount={variant.price ?? product.price} />
                  <TableCell tone="secondary">{variant.stock}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </DataTable>
        )}
      </DetailPanel>

      <DetailPanel title="Магазин і продавець">
        <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <DetailItem label="Магазин" value={product.storeName} />
          <DetailItem label="Slug магазину" value={product.storeSlug} />
          <DetailItem label="Бізнес-назва" value={product.sellerBusinessName} />
          <DetailItem label="Email власника" value={product.storeOwnerEmail} />
          <DetailItem label="ID власника" value={product.storeOwnerId} />
          <DetailItem label="ID магазину" value={product.storeId} />
        </dl>
      </DetailPanel>
    </div>
  )
}
