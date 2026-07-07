// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const {
  getSessionMock,
  onAuthStateChangeMock,
  pathnameRef,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  pathnameRef: {
    current: '/',
  },
}))

const mockCartStoreState = {
  sessionId: 'guest-session-1',
  itemCount: 0,
  refreshKey: 0,
  ensureSessionId: vi.fn(() => 'guest-session-1'),
  setItemCount: vi.fn((count: number) => {
    mockCartStoreState.itemCount = count
  }),
  bumpRefreshKey: vi.fn(() => {
    mockCartStoreState.refreshKey += 1
  }),
  openCart: vi.fn(),
  closeCart: vi.fn(),
}

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameRef.current,
}))

vi.mock('@/lib/supabase-browser', () => ({
  getSupabaseBrowser: () => ({
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
    },
  }),
}))

vi.mock('@/store/cartStore', () => {
  const useCartStoreMock = ((selector?: (state: typeof mockCartStoreState) => unknown) =>
    selector ? selector(mockCartStoreState) : mockCartStoreState) as typeof import('@/store/cartStore').useCartStore

  Object.assign(useCartStoreMock, {
    getState: () => mockCartStoreState,
    setState: (partial: Partial<typeof mockCartStoreState>) =>
      Object.assign(mockCartStoreState, partial),
  })

  return {
    useCartStore: useCartStoreMock,
  }
})

import AuthSessionProvider from '@/components/auth/AuthSessionProvider'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useCartStore } from '@/store/cartStore'

function SessionProbe() {
  const {
    user,
    isAuthenticated,
    hasCompletedInitialSync,
    isSyncingUser,
  } = useCurrentUser()

  return (
    <div>
      <span data-testid="auth-state">
        {isAuthenticated ? 'authenticated' : 'guest'}
      </span>
      <span data-testid="user-email">{user?.email ?? 'guest'}</span>
      <span data-testid="sync-state">
        {hasCompletedInitialSync ? 'sync-complete' : 'sync-pending'}
      </span>
      <span data-testid="user-sync-state">
        {isSyncingUser ? 'user-syncing' : 'user-idle'}
      </span>
    </div>
  )
}

async function flushAsyncWork() {
  await Promise.resolve()
  await Promise.resolve()
}

describe('AuthSessionProvider', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let fetchMock: ReturnType<typeof vi.fn>
  let authStateCallback:
    | ((event: string, session: { access_token: string } | null) => void)
    | null

  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    authStateCallback = null
    pathnameRef.current = '/'

    mockCartStoreState.sessionId = 'guest-session-1'
    mockCartStoreState.itemCount = 0
    mockCartStoreState.refreshKey = 0

    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'access-token-1',
        },
      },
    })

    onAuthStateChangeMock.mockImplementation((callback) => {
      authStateCallback = callback as typeof authStateCallback

      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      }
    })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false
    vi.unstubAllGlobals()
    container.remove()
  })

  it('syncs an existing browser session without requiring a page refresh', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'user-1',
          email: 'user@example.com',
          roles: ['BUYER'],
        },
      }),
    })

    await act(async () => {
      root.render(
        <AuthSessionProvider initialUser={null}>
          <SessionProbe />
        </AuthSessionProvider>,
      )

      await flushAsyncWork()
    })

    expect(container.querySelector('[data-testid="auth-state"]')?.textContent).toBe(
      'authenticated',
    )
    expect(container.querySelector('[data-testid="user-email"]')?.textContent).toBe(
      'user@example.com',
    )
    expect(container.querySelector('[data-testid="sync-state"]')?.textContent).toBe(
      'sync-complete',
    )
    expect(container.querySelector('[data-testid="user-sync-state"]')?.textContent).toBe(
      'user-idle',
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/sync',
      expect.objectContaining({
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
        headers: expect.any(Headers),
      }),
    )

    const requestHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Headers
    expect(requestHeaders.get('Authorization')).toBe('Bearer access-token-1')
    expect(requestHeaders.get('x-session-id')).toBe('guest-session-1')
    expect(useCartStore.getState().refreshKey).toBe(1)
  })

  it('exposes sync-pending state while authenticated user sync is still running', async () => {
    let resolveSync:
      | ((value: {
          ok: true
          json: () => Promise<{
            success: true
            data: { id: string; email: string; roles: string[] }
          }>
        }) => void)
      | null = null

    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSync = resolve
        }),
    )

    await act(async () => {
      root.render(
        <AuthSessionProvider initialUser={null}>
          <SessionProbe />
        </AuthSessionProvider>,
      )

      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="sync-state"]')?.textContent).toBe(
      'sync-pending',
    )
    expect(container.querySelector('[data-testid="user-sync-state"]')?.textContent).toBe(
      'user-syncing',
    )

    await act(async () => {
      resolveSync?.({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'user-1',
            email: 'user@example.com',
            roles: ['BUYER'],
          },
        }),
      })

      await flushAsyncWork()
    })

    expect(container.querySelector('[data-testid="sync-state"]')?.textContent).toBe(
      'sync-complete',
    )
    expect(container.querySelector('[data-testid="user-sync-state"]')?.textContent).toBe(
      'user-idle',
    )
  })

  it('clears the session immediately on sign out events', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'user-1',
          email: 'user@example.com',
          roles: ['BUYER'],
        },
      }),
    })

    await act(async () => {
      root.render(
        <AuthSessionProvider initialUser={null}>
          <SessionProbe />
        </AuthSessionProvider>,
      )

      await flushAsyncWork()
    })

    expect(authStateCallback).not.toBeNull()

    act(() => {
      authStateCallback?.('SIGNED_OUT', null)
    })

    expect(container.querySelector('[data-testid="auth-state"]')?.textContent).toBe(
      'guest',
    )
    expect(container.querySelector('[data-testid="user-email"]')?.textContent).toBe(
      'guest',
    )
    expect(useCartStore.getState().refreshKey).toBe(2)
  })

  it('does not refetch /api/auth/me on public pathname changes', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'user-1',
          email: 'user@example.com',
          roles: ['BUYER'],
        },
      }),
    })

    await act(async () => {
      root.render(
        <AuthSessionProvider initialUser={null}>
          <SessionProbe />
        </AuthSessionProvider>,
      )

      await flushAsyncWork()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/auth/sync',
      expect.objectContaining({
        method: 'POST',
      }),
    )

    pathnameRef.current = '/catalog'

    await act(async () => {
      root.render(
        <AuthSessionProvider initialUser={null}>
          <SessionProbe />
        </AuthSessionProvider>,
      )

      await flushAsyncWork()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(
      fetchMock.mock.calls.some((call) => call[0] === '/api/auth/me'),
    ).toBe(false)
  })
})
