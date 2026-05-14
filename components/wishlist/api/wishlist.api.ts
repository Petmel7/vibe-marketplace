import { supabaseBrowser } from '@/lib/supabase-browser'

import {
    UnauthorizedError,
    WishlistApiError,
} from '../errors/wishlist.errors'

async function getAccessToken() {
    const {
        data: { session },
    } = await supabaseBrowser.auth.getSession()

    if (!session?.access_token) {
        throw new UnauthorizedError()
    }

    return session.access_token
}

async function request<T>(
    path: string,
    options?: RequestInit,
): Promise<T> {
    const token = await getAccessToken()

    const res = await fetch(path, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...options?.headers,
        },
    })

    const json = await res.json()

    if (!json.success) {
        throw new WishlistApiError(
            json.error?.message ??
            'Wishlist request failed',
        )
    }

    return json.data
}

export const wishlistApi = {
    add(productId: string) {
        return request('/api/wishlist', {
            method: 'POST',
            body: JSON.stringify({
                productId,
            }),
        })
    },

    remove(productId: string) {
        return request(`/api/wishlist/${productId}`, {
            method: 'DELETE',
        })
    },

    getAll() {
        return request('/api/wishlist')
    },
}