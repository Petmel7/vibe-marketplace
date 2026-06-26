'use client'

import { useEffect, useMemo, useState } from 'react'

type LocalPreviewFile = {
  id: string
  file: File
}

type UseLocalFilePreviewUrlsOptions = {
  files: LocalPreviewFile[]
  isPreviewable: (file: File) => boolean
}

export function useLocalFilePreviewUrls({
  files,
  isPreviewable,
}: UseLocalFilePreviewUrlsOptions) {
  const [brokenPreviewIds, setBrokenPreviewIds] = useState<string[]>([])
  const previewEntries = useMemo(
    () =>
      files
        .filter((item) => isPreviewable(item.file))
        .map((item) => ({
          id: item.id,
          url: URL.createObjectURL(item.file),
        })),
    [files, isPreviewable],
  )

  const previewUrlById = useMemo(
    () => new Map(previewEntries.map((entry) => [entry.id, entry.url])),
    [previewEntries],
  )

  useEffect(() => {
    return () => {
      for (const entry of previewEntries) {
        URL.revokeObjectURL(entry.url)
      }
    }
  }, [previewEntries])

  useEffect(() => {
    const activeIds = new Set(files.map((item) => item.id))
    setBrokenPreviewIds((current) => current.filter((id) => activeIds.has(id)))
  }, [files])

  function getPreviewUrl(id: string) {
    if (brokenPreviewIds.includes(id)) {
      return null
    }

    return previewUrlById.get(id) ?? null
  }

  function markPreviewBroken(id: string) {
    setBrokenPreviewIds((current) => (current.includes(id) ? current : [...current, id]))
  }

  return {
    getPreviewUrl,
    markPreviewBroken,
  }
}
