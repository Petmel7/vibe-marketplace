// @vitest-environment jsdom

import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    onError,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    onError?: React.ReactEventHandler<HTMLImageElement>
  }) => <img alt={alt} src={typeof src === 'string' ? src : ''} onError={onError} {...props} />,
}))

import EvidencePreviewList from '@/components/abuse-reports/EvidencePreviewList'

function createFile(name: string, type: string, contents = 'test') {
  return new File([contents], name, { type })
}

describe('EvidencePreviewList', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let createObjectUrlMock: ReturnType<typeof vi.fn<(obj: Blob | MediaSource) => string>>
  let revokeObjectUrlMock: ReturnType<typeof vi.fn<(url: string) => void>>

  beforeEach(() => {
    vi.clearAllMocks()
    ;(
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean
      }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    createObjectUrlMock = vi.fn<(obj: Blob | MediaSource) => string>((file) => {
      if (file instanceof File) {
        return `blob:${file.name}`
      }

      return 'blob:media-source'
    })
    revokeObjectUrlMock = vi.fn<(url: string) => void>()
    URL.createObjectURL = createObjectUrlMock
    URL.revokeObjectURL = revokeObjectUrlMock
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('shows local WEBP, JPG, and PNG thumbnails for abuse report evidence', () => {
    act(() => {
      root.render(
        <EvidencePreviewList
          files={[
            { id: 'webp-1', file: createFile('proof.webp', 'image/webp') },
            { id: 'jpg-1', file: createFile('proof.jpg', 'image/jpeg') },
            { id: 'png-1', file: createFile('proof.png', 'image/png') },
          ]}
          onRemoveFile={vi.fn()}
        />,
      )
    })

    const images = Array.from(container.querySelectorAll('img'))

    expect(images).toHaveLength(3)
    expect(images.map((image) => image.getAttribute('alt'))).toEqual([
      'proof.webp',
      'proof.jpg',
      'proof.png',
    ])
    expect(createObjectUrlMock).toHaveBeenCalledTimes(3)
    expect(container.textContent).toContain('Буде завантажено після створення скарги')
    expect(container.textContent).toContain('Прибрати')
  })

  it('shows a document fallback for local PDF evidence', () => {
    act(() => {
      root.render(
        <EvidencePreviewList
          files={[{ id: 'pdf-1', file: createFile('proof.pdf', 'application/pdf') }]}
          onRemoveFile={vi.fn()}
        />,
      )
    })

    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('PDF')
  })

  it('revokes preview URLs when a local evidence file is removed', () => {
    function Probe() {
      const [files, setFiles] = useState([
        { id: 'webp-1', file: createFile('proof.webp', 'image/webp') },
      ])

      return (
        <EvidencePreviewList
          files={files}
          onRemoveFile={(id) => {
            setFiles((current) => current.filter((item) => item.id !== id))
          }}
        />
      )
    }

    act(() => {
      root.render(<Probe />)
    })

    const removeButton = container.querySelector('button')

    act(() => {
      removeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    expect(container.querySelector('img')).toBeNull()
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:proof.webp')
  })
})
