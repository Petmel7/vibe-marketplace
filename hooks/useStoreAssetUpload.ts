'use client'

import { useState } from 'react'
import { toast } from 'sonner'

type UploadKind = 'logo' | 'banner'

type UploadState = {
  kind: UploadKind | null
  status: 'idle' | 'uploading' | 'success' | 'error'
  errorMessage: string | null
}

type StorefrontAssetUploadResponse = {
  asset: {
    url: string
    storagePath: string
  }
  store: {
    logoUrl: string | null
    bannerUrl: string | null
  }
}

export type UploadedStoreAsset = {
  kind: UploadKind
  fileName: string
  publicUrl: string
  url: string
  storagePath: string
  store: {
    logoUrl: string | null
    bannerUrl: string | null
  }
}

function normalizeStoreAssetUploadResponse(
  kind: UploadKind,
  file: File,
  payload: StorefrontAssetUploadResponse,
): UploadedStoreAsset {
  return {
    kind,
    fileName: file.name,
    publicUrl: payload.asset.url,
    url: payload.asset.url,
    storagePath: payload.asset.storagePath,
    store: {
      logoUrl: payload.store.logoUrl,
      bannerUrl: payload.store.bannerUrl,
    },
  }
}

export function useStoreAssetUpload() {
  const [uploadState, setUploadState] = useState<UploadState>({
    kind: null,
    status: 'idle',
    errorMessage: null,
  })

  const uploadAsset = async (kind: UploadKind, file: File) => {
    setUploadState({
      kind,
      status: 'uploading',
      errorMessage: null,
    })

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`/api/seller/storefront/assets/${kind}`, {
        method: 'POST',
        body: formData,
      })

      const json = (await response.json()) as
        | { success: true; data: StorefrontAssetUploadResponse }
        | { success: false; error?: { message?: string } }

      if (!response.ok || !json.success) {
        const message = json.success ? 'Upload failed.' : json.error?.message ?? 'Upload failed.'
        setUploadState({
          kind,
          status: 'error',
          errorMessage: message,
        })
        toast.error(message)
        return null
      }

      setUploadState({
        kind,
        status: 'success',
        errorMessage: null,
      })

      return normalizeStoreAssetUploadResponse(kind, file, json.data)
    } catch {
      const message = 'Upload failed. Please try again.'
      setUploadState({
        kind,
        status: 'error',
        errorMessage: message,
      })
      toast.error(message)
      return null
    }
  }

  return {
    uploadAsset,
    uploadState,
    isUploading: uploadState.status === 'uploading',
  }
}
