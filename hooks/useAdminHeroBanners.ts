'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAdminMutation } from '@/hooks/useAdminMutation'
import {
  API_ROUTES,
  getAdminHeroBannerArchiveRoute,
  getAdminHeroBannerPauseRoute,
  getAdminHeroBannerPublishRoute,
  getAdminHeroBannerRoute,
} from '@/lib/constants/apiRoutes'
import type { HeroBannerImageSlot, UploadedMediaAssetDto } from '@/features/media/media.dto'
import type { HeroBanner, HeroBannerPayload } from '@/types/hero-banners'

type ApiSuccess<T> = { success: true; data: T }
type ApiError = { success: false; error?: { message?: string; code?: string } }

async function readApiResponse<T>(response: Response, fallbackMessage: string): Promise<T | undefined> {
  const json = (await response.json()) as ApiSuccess<T> | ApiError

  if (!response.ok || !json.success) {
    toast.error(json.success ? fallbackMessage : json.error?.message ?? fallbackMessage)
    return undefined
  }

  return json.data
}

export function useAdminHeroBanners() {
  const router = useRouter()
  const mutation = useAdminMutation()
  const [isUploading, setIsUploading] = useState(false)

  return {
    ...mutation,
    isUploading,
    createHeroBanner: (body: HeroBannerPayload) =>
      mutation.execute<HeroBanner>({
        url: API_ROUTES.adminHeroBanners,
        method: 'POST',
        body,
        successMessage: 'Hero-банер створено.',
        fallbackErrorMessage: 'Не вдалося створити Hero-банер.',
        onSuccess: async (data) => {
          router.push(`/admin/hero-banners/${data.id}`)
        },
      }),
    updateHeroBanner: (bannerId: string, body: Partial<HeroBannerPayload>) =>
      mutation.execute<HeroBanner>({
        url: getAdminHeroBannerRoute(bannerId),
        method: 'PATCH',
        body,
        successMessage: 'Hero-банер оновлено.',
        fallbackErrorMessage: 'Не вдалося оновити Hero-банер.',
      }),
    publishHeroBanner: (bannerId: string) =>
      mutation.execute<HeroBanner>({
        url: getAdminHeroBannerPublishRoute(bannerId),
        method: 'PATCH',
        successMessage: 'Hero-банер опубліковано.',
        fallbackErrorMessage: 'Не вдалося опублікувати Hero-банер.',
      }),
    pauseHeroBanner: (bannerId: string) =>
      mutation.execute<HeroBanner>({
        url: getAdminHeroBannerPauseRoute(bannerId),
        method: 'PATCH',
        successMessage: 'Hero-банер призупинено.',
        fallbackErrorMessage: 'Не вдалося призупинити Hero-банер.',
      }),
    archiveHeroBanner: (bannerId: string) =>
      mutation.execute<HeroBanner>({
        url: getAdminHeroBannerArchiveRoute(bannerId),
        method: 'PATCH',
        successMessage: 'Hero-банер архівовано.',
        fallbackErrorMessage: 'Не вдалося архівувати Hero-банер.',
      }),
    deleteHeroBanner: (bannerId: string) =>
      mutation.execute<null>({
        url: getAdminHeroBannerRoute(bannerId),
        method: 'DELETE',
        successMessage: 'Hero-банер видалено.',
        fallbackErrorMessage: 'Не вдалося видалити Hero-банер.',
        onSuccess: async () => {
          router.push('/admin/hero-banners')
        },
      }),
    reorderHeroBanners: (items: Array<{ id: string; sortOrder: number }>) =>
      mutation.execute({
        url: API_ROUTES.adminHeroBannerReorder,
        method: 'PATCH',
        body: { items },
        successMessage: 'Порядок Hero-банерів оновлено.',
        fallbackErrorMessage: 'Не вдалося оновити порядок Hero-банерів.',
      }),
    uploadHeroBannerImage: async (slot: HeroBannerImageSlot, file: File) => {
      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.set('slot', slot)
        formData.set('file', file)

        const response = await fetch(API_ROUTES.adminHeroBannerImages, {
          method: 'POST',
          body: formData,
        })
        const uploaded = await readApiResponse<UploadedMediaAssetDto>(
          response,
          'Не вдалося завантажити зображення Hero-банера.',
        )
        if (uploaded) {
          toast.success('Зображення завантажено.')
        }
        return uploaded ?? null
      } catch {
        toast.error('Не вдалося завантажити зображення Hero-банера.')
        return null
      } finally {
        setIsUploading(false)
      }
    },
    removeHeroBannerImage: async (storagePath: string) => {
      setIsUploading(true)
      try {
        const response = await fetch(API_ROUTES.adminHeroBannerImages, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storagePath }),
        })
        const removed = await readApiResponse<null>(
          response,
          'Не вдалося видалити зображення Hero-банера.',
        )
        if (removed !== undefined) {
          toast.success('Зображення видалено.')
        }
        return removed !== undefined
      } catch {
        toast.error('Не вдалося видалити зображення Hero-банера.')
        return false
      } finally {
        setIsUploading(false)
      }
    },
  }
}
