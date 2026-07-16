// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SellerProductForm from './SellerProductForm'

const routerPush = vi.fn()
const routerReplace = vi.fn()
const routerRefresh = vi.fn()

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let mockCategories: Array<{
  id: string
  name: string
  slug: string
  parentId: string | null
  children: Array<{
    id: string
    name: string
    slug: string
    parentId: string | null
    children: []
  }>
}> = []
let mockUploadImages = vi.fn(async () => [])
let mockRemoveImage = vi.fn(async () => true)
let mockReorderImages = vi.fn(async () => [])
let mockSetPrimaryImage = vi.fn(async () => [])
let mockIsUploading = false

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
    refresh: routerRefresh,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/hooks/useSellerCategories', () => ({
  useSellerCategories: () => ({
    categories: mockCategories,
    isLoading: false,
    errorMessage: null,
  }),
}))

vi.mock('@/hooks/useProductImageUpload', () => ({
  useProductImageUpload: () => ({
    uploadImages: mockUploadImages,
    removeImage: mockRemoveImage,
    reorderImages: mockReorderImages,
    setPrimaryImage: mockSetPrimaryImage,
    progress: { errorMessage: null },
    isUploading: mockIsUploading,
  }),
}))

vi.mock('@/components/seller/CategoryBreadcrumb', () => ({
  default: () => <div data-testid="category-breadcrumb" />,
}))

vi.mock('@/components/seller/CategoryTreeSelect', () => ({
  default: () => <div data-testid="category-tree-select" />,
}))

vi.mock('@/components/seller/MultiImageUploadField', () => ({
  default: ({ onFilesSelected }: { onFilesSelected: (files: File[]) => void }) => (
    <button
      type="button"
      data-testid="mock-add-image"
      onClick={() => onFilesSelected([new File(['image'], 'product.png', { type: 'image/png' })])}
    >
      add-image
    </button>
  ),
}))

vi.mock('@/components/seller/ProductStatusBadge', () => ({
  default: ({ status }: { status: string }) => <div data-testid="product-status-badge">{status}</div>,
}))

vi.mock('@/components/seller/UploadProgress', () => ({
  default: () => null,
}))

function createSuccessResponse<T>(data: T, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ success: true as const, data }),
  } satisfies Response
}

function createErrorResponse(message: string, code = 'REQUEST_FAILED', status = 400) {
  return {
    ok: false,
    status,
    json: async () => ({
      success: false as const,
      error: {
        message,
        code,
      },
    }),
  } satisfies Response
}

function createDraftProduct(overrides?: Partial<{
  id: string
  name: string
  description: string | null
  price: string
  imageUrl: string | null
  sku: string | null
  categoryId: string | null
  status: 'DRAFT' | 'PENDING_REVIEW'
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
}>) {
  return {
    id: 'product-1',
    name: 'Плаття вечірнє',
    description: 'Дуже докладний опис товару для успішної модерації та покупки на маркетплейсі.',
    price: '1999',
    imageUrl: '/image-1.jpg',
    sku: 'PRD-TEST-001',
    categoryId: 'cat-leaf',
    status: 'DRAFT' as const,
    rejectionReason: null,
    images: [
      {
        id: 'image-1',
        url: '/image-1.jpg',
        storagePath: 'products/image-1.jpg',
        altText: 'Плаття',
        position: 0,
        isPrimary: true,
      },
    ],
    variants: [
      {
        id: 'variant-1',
        sku: 'VAR-TEST-001',
        size: 'M',
        color: 'Чорний',
        price: '1999',
        stock: 5,
      },
    ],
    ...overrides,
  }
}

function getButtonByText(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.trim() === text) ?? null
}

function getInputByLabel(container: HTMLElement, labelText: string) {
  const label = Array.from(container.querySelectorAll('label')).find((element) =>
    element.textContent?.includes(labelText),
  )
  return label?.querySelector('input, textarea, select') ?? null
}

async function setFieldValue(element: Element, value: string) {
  await act(async () => {
    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    const prototype = Object.getPrototypeOf(input) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
    valueSetter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

async function submitForm(container: HTMLElement) {
  const form = container.querySelector('form')
  expect(form).not.toBeNull()

  await act(async () => {
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('SellerProductForm flow', () => {
  let container: HTMLDivElement
  let root: Root
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    routerPush.mockReset()
    routerReplace.mockReset()
    routerRefresh.mockReset()
    mockUploadImages = vi.fn(async () => [])
    mockRemoveImage = vi.fn(async () => true)
    mockReorderImages = vi.fn(async () => [])
    mockSetPrimaryImage = vi.fn(async () => [])
    mockIsUploading = false
    mockCategories = [
      {
        id: 'cat-root',
        name: 'Одяг та взуття',
        slug: 'clothing-shoes',
        parentId: null,
        children: [
          {
            id: 'cat-leaf',
            name: 'Сукні',
            slug: 'dresses',
            parentId: 'cat-root',
            children: [],
          },
        ],
      },
    ]
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    vi.unstubAllGlobals()
  })

  it('shows only the draft-save action in create mode', async () => {
    await act(async () => {
      root.render(<SellerProductForm mode="create" storeSlug="maria" />)
    })

    expect(getButtonByText(container, 'Зберегти чернетку')).not.toBeNull()
    expect(getButtonByText(container, 'Надіслати на модерацію')).toBeNull()
  })

  it('creates exactly one draft and navigates to the persisted product page', async () => {
    fetchMock.mockResolvedValue(createSuccessResponse({ id: 'product-created-1' }, 201))

    await act(async () => {
      root.render(<SellerProductForm mode="create" storeSlug="maria" />)
    })

    const nameInput = getInputByLabel(container, 'Назва товару') as HTMLInputElement
    const priceInput = getInputByLabel(container, 'Базова ціна') as HTMLInputElement

    await setFieldValue(nameInput, 'Сукня міді')
    await setFieldValue(priceInput, '2499')

    await submitForm(container)
    await flushAsyncWork()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/seller/products',
      expect.objectContaining({
        method: 'POST',
      }),
    )
    expect(routerReplace).toHaveBeenCalledWith('/seller/products/product-created-1')
  })

  it('guards against double-clicking draft save in create mode', async () => {
    let resolveFetch: ((value: Response) => void) | null = null
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve as (value: Response) => void
        }),
    )

    await act(async () => {
      root.render(<SellerProductForm mode="create" storeSlug="maria" />)
    })

    const nameInput = getInputByLabel(container, 'Назва товару') as HTMLInputElement
    const priceInput = getInputByLabel(container, 'Базова ціна') as HTMLInputElement

    await setFieldValue(nameInput, 'Сукня міді')
    await setFieldValue(priceInput, '2499')
    const saveButton = getButtonByText(container, 'Зберегти чернетку') as HTMLButtonElement

    await act(async () => {
      const form = container.querySelector('form')
      expect(form).not.toBeNull()
      form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(saveButton.disabled).toBe(true)

    await act(async () => {
      resolveFetch?.(createSuccessResponse({ id: 'product-created-2' }, 201))
    })
    await flushAsyncWork()

    await submitForm(container)
    await flushAsyncWork()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(routerReplace).toHaveBeenCalledWith('/seller/products/product-created-2')
  })

  it('submits an existing draft without calling the create endpoint', async () => {
    fetchMock.mockResolvedValue(createSuccessResponse({ id: 'product-1', status: 'PENDING_REVIEW' }))

    await act(async () => {
      root.render(
        <SellerProductForm
          mode="edit"
          storeSlug="maria"
          initialProduct={createDraftProduct()}
        />,
      )
    })

    const submitButton = getButtonByText(container, 'Надіслати на модерацію') as HTMLButtonElement

    await act(async () => {
      submitButton.click()
    })
    await flushAsyncWork()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/seller/products/product-1/submit',
      expect.objectContaining({
        method: 'POST',
      }),
    )
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/seller/products',
      expect.anything(),
    )
    expect(routerPush).not.toHaveBeenCalled()
    expect(routerReplace).not.toHaveBeenCalled()
    expect(routerRefresh).toHaveBeenCalled()
  })

  it('guards against double-clicking submit for review', async () => {
    let resolveFetch: ((value: Response) => void) | null = null
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve as (value: Response) => void
        }),
    )

    await act(async () => {
      root.render(
        <SellerProductForm
          mode="edit"
          storeSlug="maria"
          initialProduct={createDraftProduct()}
        />,
      )
    })

    const submitButton = getButtonByText(container, 'Надіслати на модерацію') as HTMLButtonElement

    await act(async () => {
      submitButton.click()
      submitButton.click()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/seller/products/product-1/submit',
      expect.objectContaining({ method: 'POST' }),
    )

    await act(async () => {
      resolveFetch?.(createSuccessResponse({ id: 'product-1', status: 'PENDING_REVIEW' }))
    })
    await flushAsyncWork()
  })

  it('blocks moderation submit when the draft has unsaved edits', async () => {
    await act(async () => {
      root.render(
        <SellerProductForm
          mode="edit"
          storeSlug="maria"
          initialProduct={createDraftProduct()}
        />,
      )
    })

    const nameInput = getInputByLabel(container, 'Назва товару') as HTMLInputElement

    await setFieldValue(nameInput, 'Плаття оновлене')

    const submitButton = getButtonByText(container, 'Надіслати на модерацію') as HTMLButtonElement

    await act(async () => {
      submitButton.click()
    })
    await flushAsyncWork()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Спочатку збережіть незбережені зміни в полях, галереї та варіантах.')
  })

  it('keeps save disabled during gallery persistence and then redirects with replace', async () => {
    const persistedImages = [
      {
        id: 'uploaded-1',
        url: '/uploaded-1.jpg',
        previewUrl: null,
        storagePath: 'products/uploaded-1.jpg',
        altText: 'Сукня міді — зображення товару',
        isPrimary: true,
        position: 0,
        source: 'server' as const,
      },
    ]

    let resolveUpload: ((value: typeof persistedImages) => void) | null = null

    fetchMock.mockResolvedValue(createSuccessResponse({ id: 'product-created-3' }, 201))
    mockUploadImages = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve as (value: typeof persistedImages) => void
        }),
    )
    mockReorderImages = vi.fn(async () => persistedImages)
    mockSetPrimaryImage = vi.fn(async () => persistedImages)

    await act(async () => {
      root.render(<SellerProductForm mode="create" storeSlug="maria" />)
    })

    await setFieldValue(getInputByLabel(container, 'Назва товару') as HTMLInputElement, 'Сукня міді')
    await setFieldValue(getInputByLabel(container, 'Базова ціна') as HTMLInputElement, '2499')

    const addImageButton = container.querySelector('[data-testid="mock-add-image"]') as HTMLButtonElement
    const saveButton = getButtonByText(container, 'Зберегти чернетку') as HTMLButtonElement

    await act(async () => {
      addImageButton.click()
    })

    await submitForm(container)
    await flushAsyncWork()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(mockUploadImages).toHaveBeenCalledTimes(1)
    expect(saveButton.disabled).toBe(true)

    await act(async () => {
      resolveUpload?.(persistedImages)
    })
    await flushAsyncWork()

    expect(routerReplace).toHaveBeenCalledWith('/seller/products/product-created-3')
  })

  it('re-enables save and does not redirect when create fails', async () => {
    fetchMock.mockResolvedValue(createErrorResponse('Не вдалося створити чернетку', 'CREATE_FAILED', 500))

    await act(async () => {
      root.render(<SellerProductForm mode="create" storeSlug="maria" />)
    })

    const nameInput = getInputByLabel(container, 'Назва товару') as HTMLInputElement
    const priceInput = getInputByLabel(container, 'Базова ціна') as HTMLInputElement
    const saveButton = getButtonByText(container, 'Зберегти чернетку') as HTMLButtonElement

    await setFieldValue(nameInput, 'Сукня міді')
    await setFieldValue(priceInput, '2499')

    await submitForm(container)
    await flushAsyncWork()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(routerReplace).not.toHaveBeenCalled()
    expect(saveButton.disabled).toBe(false)
    expect(nameInput.value).toBe('Сукня міді')
    expect(priceInput.value).toBe('2499')
    expect(container.textContent).toContain('Не вдалося створити чернетку')
  })

  it('shows moderation submit only for draft products in edit mode', async () => {
    await act(async () => {
      root.render(
        <SellerProductForm
          mode="edit"
          storeSlug="maria"
          initialProduct={createDraftProduct()}
        />,
      )
    })

    expect(getButtonByText(container, 'Надіслати на модерацію')).not.toBeNull()
    expect(getButtonByText(container, 'Зберегти чернетку')).not.toBeNull()

    await act(async () => {
      root.render(
        <SellerProductForm
          mode="edit"
          storeSlug="maria"
          initialProduct={createDraftProduct({ status: 'PENDING_REVIEW' })}
        />,
      )
    })

    expect(getButtonByText(container, 'Надіслати на модерацію')).toBeNull()
  })
})
