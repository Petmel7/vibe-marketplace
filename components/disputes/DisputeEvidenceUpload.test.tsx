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

import DisputeEvidenceUpload from '@/components/disputes/DisputeEvidenceUpload'

function createFile(name: string, type: string, contents = 'test') {
  return new File([contents], name, { type })
}

describe('DisputeEvidenceUpload', () => {
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

  it('shows an image thumbnail preview for WEBP, JPG, and PNG files', () => {
    act(() => {
      root.render(
        <DisputeEvidenceUpload
          selectedFiles={[
            { id: 'webp-1', file: createFile('proof.webp', 'image/webp') },
            { id: 'jpg-1', file: createFile('proof.jpg', 'image/jpeg') },
            { id: 'png-1', file: createFile('proof.png', 'image/png') },
          ]}
          onFilesSelected={vi.fn()}
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
    expect(container.textContent).toContain('Докази')
    expect(container.textContent).toContain('До 5 файлів: JPG, PNG, WEBP або PDF, до 10MB кожен.')
    expect(container.textContent).toContain('Буде завантажено після відправлення')
    expect(container.textContent).toContain('Прибрати')
  })

  it('shows a PDF file label instead of an image thumbnail', () => {
    act(() => {
      root.render(
        <DisputeEvidenceUpload
          selectedFiles={[{ id: 'pdf-1', file: createFile('proof.pdf', 'application/pdf') }]}
          onFilesSelected={vi.fn()}
          onRemoveFile={vi.fn()}
        />,
      )
    })

    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('PDF')
  })

  it('removes previews and revokes object URLs when a file is removed', () => {
    function Probe() {
      const [selectedFiles, setSelectedFiles] = useState([
        { id: 'webp-1', file: createFile('proof.webp', 'image/webp') },
      ])

      return (
        <DisputeEvidenceUpload
          selectedFiles={selectedFiles}
          onFilesSelected={vi.fn()}
          onRemoveFile={(id) => {
            setSelectedFiles((current) => current.filter((item) => item.id !== id))
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

  it('falls back to the file icon when the image preview fails to load and revokes URLs on unmount', () => {
    act(() => {
      root.render(
        <DisputeEvidenceUpload
          selectedFiles={[{ id: 'broken-1', file: createFile('broken.webp', 'image/webp') }]}
          onFilesSelected={vi.fn()}
          onRemoveFile={vi.fn()}
        />,
      )
    })

    const image = container.querySelector('img')

    act(() => {
      image?.dispatchEvent(new Event('error', { bubbles: true }))
    })

    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('IMG')

    act(() => {
      root.unmount()
    })

    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:broken.webp')
  })
})
