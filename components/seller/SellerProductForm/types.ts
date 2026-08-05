import type { SellerProductStatus } from '@/types/seller'

export type VariantState = {
  id?: string
  sku: string
  size: string
  color: string
  price: string
  stock: number
  isSkuManual: boolean
}

export type ProductEditorValue = {
  id: string
  name: string
  description: string | null
  price: string
  imageUrl: string | null
  sku: string | null
  categoryId: string | null
  status: SellerProductStatus
  rejectionReason: string | null
  images: Array<{
    id: string
    url: string
    storagePath: string
    altText: string | null
    position: number
    isPrimary: boolean
  }>
  variants: Array<{
    id: string
    sku: string
    size: string | null
    color: string | null
    price: string | null
    stock: number
  }>
}

export type SellerProductFieldErrors = Record<string, string[]>
