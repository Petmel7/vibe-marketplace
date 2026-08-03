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

function getFilePreviewKey({ id, file }: LocalPreviewFile) {
  return `${id}:${file.name}:${file.size}:${file.lastModified}`
}

export function useLocalFilePreviewUrls({
  files,
  isPreviewable,
}: UseLocalFilePreviewUrlsOptions) {
  const [brokenPreviewKeys, setBrokenPreviewKeys] = useState<string[]>([])
  const previewEntries = useMemo(
    () =>
      files
        .filter((item) => isPreviewable(item.file))
        .map((item) => ({
          id: item.id,
          previewKey: getFilePreviewKey(item),
          url: URL.createObjectURL(item.file),
        })),
    [files, isPreviewable],
  )

  const previewUrlById = useMemo(
    () => new Map(previewEntries.map((entry) => [entry.id, entry.url])),
    [previewEntries],
  )
  const previewKeyById = useMemo(
    () => new Map(previewEntries.map((entry) => [entry.id, entry.previewKey])),
    [previewEntries],
  )

  useEffect(() => {
    return () => {
      for (const entry of previewEntries) {
        URL.revokeObjectURL(entry.url)
      }
    }
  }, [previewEntries])

  function getPreviewUrl(id: string) {
    const previewKey = previewKeyById.get(id)

    if (!previewKey || brokenPreviewKeys.includes(previewKey)) {
      return null
    }

    return previewUrlById.get(id) ?? null
  }

  function markPreviewBroken(id: string) {
    const previewKey = previewKeyById.get(id)

    if (!previewKey) {
      return
    }

    setBrokenPreviewKeys((current) =>
      current.includes(previewKey) ? current : [...current, previewKey],
    )
  }

  return {
    getPreviewUrl,
    markPreviewBroken,
  }
}
