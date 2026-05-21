'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export type ProductImageDraft = {
  id: string
  file?: File
  url: string
  storagePath?: string | null
  altText: string
  isPrimary: boolean
  position: number
  source: 'local' | 'server'
}

type ProgressState = {
  status: 'idle' | 'uploading' | 'success' | 'error'
  current: number
  total: number
  label: string
  errorMessage: string | null
}

type ProductImageResponse = {
  id: string
  productId: string
  url: string
  storagePath: string
  altText: string | null
  position: number
  isPrimary: boolean
}

export function normalizeProductImage(image: ProductImageResponse): ProductImageDraft {
  return {
    id: image.id,
    url: image.url,
    storagePath: image.storagePath,
    altText: image.altText ?? '',
    isPrimary: image.isPrimary,
    position: image.position,
    source: 'server',
  }
}

function normalizeImages(images: ProductImageResponse[]): ProductImageDraft[] {
  return images
    .slice()
    .sort((left, right) => left.position - right.position)
    .map(normalizeProductImage)
}

export function useProductImageUpload() {
  const [progress, setProgress] = useState<ProgressState>({
    status: 'idle',
    current: 0,
    total: 0,
    label: '',
    errorMessage: null,
  })

  const uploadImages = async (productId: string, drafts: ProductImageDraft[]) => {
    const queue = drafts.filter((draft) => draft.file)

    if (queue.length === 0) {
      return [] as ProductImageDraft[]
    }

    const uploaded: ProductImageDraft[] = []

    setProgress({
      status: 'uploading',
      current: 0,
      total: queue.length,
      label: 'Uploading product images...',
      errorMessage: null,
    })

    for (let index = 0; index < queue.length; index += 1) {
      const draft = queue[index]
      const formData = new FormData()
      formData.append('file', draft.file as File)
      formData.append('altText', draft.altText)
      formData.append('position', String(draft.position))
      formData.append('isPrimary', String(draft.isPrimary))

      try {
        const response = await fetch(`/api/seller/products/${productId}/images`, {
          method: 'POST',
          body: formData,
        })

        const json = (await response.json()) as
          | { success: true; data: ProductImageResponse }
          | { success: false; error?: { message?: string } }

        if (!response.ok || !json.success) {
          const message = json.success ? 'Image upload failed.' : json.error?.message ?? 'Image upload failed.'
          setProgress({
            status: 'error',
            current: index,
            total: queue.length,
            label: 'Uploading product images...',
            errorMessage: message,
          })
          toast.error(message)
          return null
        }

        uploaded.push(normalizeProductImage(json.data))

        setProgress({
          status: 'uploading',
          current: index + 1,
          total: queue.length,
          label: 'Uploading product images...',
          errorMessage: null,
        })
      } catch {
        const message = 'Image upload failed. Please try again.'
        setProgress({
          status: 'error',
          current: index,
          total: queue.length,
          label: 'Uploading product images...',
          errorMessage: message,
        })
        toast.error(message)
        return null
      }
    }

    setProgress({
      status: 'success',
      current: queue.length,
      total: queue.length,
      label: 'Product images uploaded.',
      errorMessage: null,
    })

    return uploaded
  }

  const removeImage = async (productId: string, imageId: string) => {
    const response = await fetch(`/api/seller/products/${productId}/images/${imageId}`, {
      method: 'DELETE',
    })

    const json = (await response.json()) as
      | { success: true; data: null }
      | { success: false; error?: { message?: string } }

    if (!response.ok || !json.success) {
      const message = json.success ? 'Unable to remove image.' : json.error?.message ?? 'Unable to remove image.'
      toast.error(message)
      return false
    }

    return true
  }

  const reorderImages = async (
    productId: string,
    images: Array<{ id: string; position: number }>,
  ) => {
    const response = await fetch(`/api/seller/products/${productId}/images`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images }),
    })

    const json = (await response.json()) as
      | { success: true; data: ProductImageResponse[] }
      | { success: false; error?: { message?: string } }

    if (!response.ok || !json.success) {
      const message = json.success ? 'Unable to reorder images.' : json.error?.message ?? 'Unable to reorder images.'
      toast.error(message)
      return null
    }

    return normalizeImages(json.data)
  }

  const setPrimaryImage = async (productId: string, imageId: string) => {
    const response = await fetch(`/api/seller/products/${productId}/images/${imageId}/primary`, {
      method: 'PATCH',
    })

    const json = (await response.json()) as
      | { success: true; data: ProductImageResponse[] }
      | { success: false; error?: { message?: string } }

    if (!response.ok || !json.success) {
      const message = json.success ? 'Unable to update primary image.' : json.error?.message ?? 'Unable to update primary image.'
      toast.error(message)
      return null
    }

    return normalizeImages(json.data)
  }

  return {
    uploadImages,
    removeImage,
    reorderImages,
    setPrimaryImage,
    progress,
    isUploading: progress.status === 'uploading',
  }
}
